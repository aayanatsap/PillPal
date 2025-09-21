from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, time, timedelta
import os
from .security import verify_jwt
from .database import get_db, supabase
from .models import User, Medication, MedTime, Dose, DoseStatus, UserRole
from .gemini_service import gemini_service
from .sns_service import sns_service
from sqlalchemy.orm import Session
from typing import Dict, Any
import io
import csv

app = FastAPI(title="PillPal API", version="0.1.0")

origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class IntentRequest(BaseModel):
    query: str

class IntentResponse(BaseModel):
    intent: str
    data: dict

# Pydantic models for API
class UserCreate(BaseModel):
    name: str
    role: UserRole

class UserResponse(BaseModel):
    id: str
    auth0_sub: str
    name: str
    role: UserRole
    phone_enc: Optional[str] = None
    created_at: datetime

class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[UserRole] = None
    phone_enc: Optional[str] = None

class MedicationCreate(BaseModel):
    name: str
    strength_text: Optional[str] = None
    dose_text: Optional[str] = None
    instructions: Optional[str] = None
    times: List[str] = []  # ["08:00", "20:00"]
    frequency_text: Optional[str] = None

class MedicationResponse(BaseModel):
    id: str
    name: str
    strength_text: Optional[str]
    dose_text: Optional[str]
    instructions: Optional[str]
    times: List[str]
    frequency_text: Optional[str] = None
    created_at: datetime

class DoseCreate(BaseModel):
    medication_id: str
    scheduled_at: datetime
    notes: Optional[str] = None

class DoseResponse(BaseModel):
    id: str
    medication_id: str
    scheduled_at: datetime
    status: DoseStatus
    taken_at: Optional[datetime]
    notes: Optional[str]
    medication_name: str

class DoseUpdate(BaseModel):
    status: DoseStatus
    taken_at: Optional[datetime] = None
    notes: Optional[str] = None


@app.get("/healthz")
async def healthz() -> dict:
    return {"status": "ok"}


@app.post("/api/v1/intent", response_model=IntentResponse)
async def parse_intent(body: IntentRequest, claims: dict = Depends(verify_jwt)):
    """Parse voice/text intent using Gemini AI"""
    user_id = await get_or_create_user(claims)

    # Build lightweight personalization context for grounding answers
    # meds (name, strength, instructions), next dose time
    context = {"medications": [], "next_dose": None}
    try:
        meds = supabase.table("medications").select("id,name,strength_text,instructions").eq("user_id", user_id).execute()
        context["medications"] = meds.data or []
        nd = supabase.rpc("exec_sql", {"sql": f"SELECT * FROM v_next_dose WHERE user_id = '{user_id}'"}).execute()
        if nd.data:
            context["next_dose"] = nd.data[0]
    except Exception:
        pass

    # Use Gemini to parse intent with context
    result = await gemini_service.parse_voice_intent(body.query, context)
    
    # Log the intent parsing event
    intent_data = {
        "user_id": user_id,
        "raw_input_type": "text_query",
        "raw_input_ref": body.query,
        "gemini_model": "gemini-1.5-flash",
        "gemini_output": result
    }
    
    try:
        supabase.table("intake_events").insert(intent_data).execute()
    except Exception:
        pass  # Don't fail the request if logging fails
    
    return IntentResponse(
        intent=result.get("intent", "unknown"),
        data={
            "confidence": result.get("confidence", 0.0),
            "entities": result.get("entities", {}),
            "suggested_response": result.get("suggested_response", "I didn't understand that."),
            "original_query": body.query
        }
    )


@app.post("/api/v1/label-extract")
async def label_extract(
    file: UploadFile = File(...),
    claims: dict = Depends(verify_jwt)
):
    """Extract medication info from prescription label image using Gemini Vision"""
    user_id = await get_or_create_user(claims)
    
    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    try:
        # Read image data
        image_data = await file.read()
        
        # Use Gemini to extract medication info
        result = await gemini_service.extract_medication_from_label(image_data, file.content_type)
        
        # Log the extraction event
        intake_data = {
            "user_id": user_id,
            "raw_input_type": "image_label",
            "raw_input_ref": f"uploaded_file_{file.filename}",
            "gemini_model": "gemini-1.5-flash",
            "gemini_output": result
        }
        
        try:
            supabase.table("intake_events").insert(intake_data).execute()
        except Exception:
            pass  # Don't fail the request if logging fails
        
        return {
            "success": True,
            "medications": result.get("medications") or [result],
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")


@app.get("/api/v1/risk")
async def risk_for_user(_claims: dict = Depends(verify_jwt)):
    # TODO: compute risk via simple logistic regression
    return {"score": 0}


# ---------- Risk scoring (Gemini) ----------

class RiskOut(BaseModel):
    score_0_100: int
    bucket: str
    rationale: str
    suggestion: str
    contributing_factors: List[str] = []

class RiskInsights(BaseModel):
    title: str
    highlights: List[str] = []
    advice: str
    next_best_action: str
    misses_7d: int | None = None
    snoozes_7d: int | None = None
    top_missed_block: Optional[str] = None


async def _compute_features_for_user_today(user_id: str) -> Dict[str, Any]:
    """Compute derived, non-PHI features from Supabase tables for the current user."""
    now = datetime.utcnow()
    start_today = datetime(now.year, now.month, now.day)
    end_today = datetime(now.year, now.month, now.day, 23, 59, 59)

    def _block(dt_iso: str) -> str:
        try:
            hh = int(dt_iso[11:13])
        except Exception:
            return "morning"
        if 5 <= hh < 12:
            return "morning"
        if 12 <= hh < 17:
            return "midday"
        if 17 <= hh < 21:
            return "evening"
        return "night"

    # Last 7 days doses
    start7 = datetime.utcnow() - timedelta(days=6)
    try:
        # Pull all doses for last 7 days
        res7 = (
            supabase
            .table("doses")
            .select("id, scheduled_at, status, taken_at, medication_id")
            .eq("user_id", user_id)
            .gte("scheduled_at", start7.isoformat())
            .execute()
        )
        rows7 = res7.data or []
    except Exception:
        rows7 = []

    taken7 = [r for r in rows7 if r.get("status") == "taken"]
    adherence_7d = (len(taken7) / len(rows7)) if rows7 else 0.0

    # Streak: consecutive days with 100% adherence
    streak_taken_days = 0
    by_day: Dict[str, List[Dict[str, Any]]] = {}
    for r in rows7:
        dkey = (r["scheduled_at"] or "")[:10]
        by_day.setdefault(dkey, []).append(r)
    for i in range(0, 7):
        d = (start7 + timedelta(days=i)).strftime("%Y-%m-%d")
        day_rows = by_day.get(d, [])
        if day_rows and all(rr.get("status") == "taken" for rr in day_rows):
            streak_taken_days += 1
        else:
            streak_taken_days = 0

    # Recent misses/snoozes
    t48 = datetime.utcnow() - timedelta(hours=48)
    misses_48h = len([
        r for r in rows7
        if r.get("status") in ("skipped", "missed") and (r.get("scheduled_at") or "") >= t48.isoformat()
    ])
    snoozes_24h = len([r for r in rows7 if r.get("status") == "snoozed" and (r.get("scheduled_at") or "") >= (datetime.utcnow() - timedelta(hours=24)).isoformat()])

    # Today doses
    try:
        today_res = (
            supabase
            .table("doses")
            .select("id, scheduled_at, status, taken_at")
            .eq("user_id", user_id)
            .gte("scheduled_at", start_today.isoformat())
            .lte("scheduled_at", end_today.isoformat())
            .execute()
        )
        today_rows = today_res.data or []
    except Exception:
        today_rows = []
    dose_count_today = len(today_rows)

    # Complexity: average distinct meds per day in last week
    try:
        meds_res = (
            supabase
            .table("medications")
            .select("id")
            .eq("user_id", user_id)
            .execute()
        )
        med_ids = {m["id"] for m in (meds_res.data or [])}
        complexity = max(0, len(med_ids))
    except Exception:
        complexity = 0

    # Age band unavailable; set unknown
    age_band = "unknown"

    # Last taken delta and time to next
    last_taken_delta_min = None
    time_to_next_min = None
    try:
        last_taken = max(
            [r for r in rows7 if r.get("status") == "taken"],
            key=lambda r: r.get("taken_at") or r.get("scheduled_at") or "",
        ) if rows7 else None
        if last_taken:
            ts = last_taken.get("taken_at") or last_taken.get("scheduled_at")
            if ts:
                tdt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                last_taken_delta_min = int((datetime.utcnow() - tdt.replace(tzinfo=None)).total_seconds() // 60)
    except Exception:
        pass
    try:
        upcoming = min(
            [r for r in rows7 if (r.get("status") in ("pending", "snoozed")) and r.get("scheduled_at")],
            key=lambda r: r.get("scheduled_at"),
        ) if rows7 else None
        if upcoming and upcoming.get("scheduled_at"):
            ndt = datetime.fromisoformat(upcoming["scheduled_at"].replace("Z", "+00:00"))
            time_to_next_min = int((ndt.replace(tzinfo=None) - datetime.utcnow()).total_seconds() // 60)
    except Exception:
        pass

    # Caregiver acknowledgments in 7d
    try:
        acks_res = (
            supabase
            .table("alerts")
            .select("id, ack_at")
            .gte("ack_at", start7.isoformat())
            .execute()
        )
        caregiver_ack_7d = len(acks_res.data or [])
    except Exception:
        caregiver_ack_7d = 0

    now_block = _block(datetime.utcnow().isoformat())
    weekday = datetime.utcnow().weekday()

    return {
        "adherence_7d": round(adherence_7d, 3),
        "streak_taken_days": streak_taken_days,
        "misses_48h": misses_48h,
        "snoozes_24h": snoozes_24h,
        "dose_count_today": dose_count_today,
        "now_block": now_block,
        "weekday": weekday,
        "complexity": complexity,
        "age_band": age_band,
        "last_taken_delta_min": last_taken_delta_min,
        "time_to_next_min": time_to_next_min,
        "caregiver_ack_7d": caregiver_ack_7d,
    }


@app.get("/api/v1/risk/today", response_model=RiskOut)
async def risk_today(claims: dict = Depends(verify_jwt)):
    user_id = await get_or_create_user(claims)
    features = await _compute_features_for_user_today(user_id)
    # Ask Gemini
    result = await gemini_service.score_adherence_risk(features)
    if "error" in result:
        # Fallback heuristic
        a = features
        z = 0.0
        z += (1 - float(a.get("adherence_7d", 0.0))) * 1.8
        z += min(int(a.get("misses_48h", 0)), 3) * 0.8
        z += min(int(a.get("snoozes_24h", 0)), 4) * 0.4
        z += (int(a.get("dose_count_today", 0)) - 2) * 0.25
        z += (int(a.get("complexity", 0)) - 2) * 0.15
        if a.get("now_block") in ("evening", "night"):
            z += 0.25
        if int(a.get("caregiver_ack_7d", 0)) > 0:
            z += 0.6
        import math
        p = 1 / (1 + math.exp(-z))
        score = int(round(p * 100))
        bucket = "low" if score < 35 else ("medium" if score < 65 else "high")
        return RiskOut(
            score_0_100=score,
            bucket=bucket,
            rationale="Heuristic fallback based on adherence, recent misses and snoozes.",
            suggestion="Try an earlier reminder window and reduce snoozes.",
            contributing_factors=["heuristic_fallback"],
        )
    return RiskOut(
        score_0_100=int(result.get("score_0_100", 0)),
        bucket=str(result.get("bucket", "low")),
        rationale=str(result.get("rationale", "")),
        suggestion=str(result.get("suggestion", "")),
        contributing_factors=list(result.get("contributing_factors", []) or []),
    )


@app.get("/api/v1/risk/insights", response_model=RiskInsights)
async def risk_insights(claims: dict = Depends(verify_jwt)):
    user_id = await get_or_create_user(claims)
    features = await _compute_features_for_user_today(user_id)

    # Build 7-day adherence series
    now = datetime.utcnow()
    start7 = now - timedelta(days=6)
    try:
        res7 = (
            supabase
            .table("doses")
            .select("id, scheduled_at, status")
            .eq("user_id", user_id)
            .gte("scheduled_at", start7.isoformat())
            .execute()
        )
        rows7 = res7.data or []
    except Exception:
        rows7 = []

    series = []
    for i in range(6, -1, -1):
        day = datetime(now.year, now.month, now.day) - timedelta(days=i)
        d0 = day
        d1 = day + timedelta(hours=23, minutes=59, seconds=59)
        day_rows = [r for r in rows7 if (r.get("scheduled_at") or "") >= d0.isoformat() and (r.get("scheduled_at") or "") <= d1.isoformat()]
        if day_rows:
            taken = len([r for r in day_rows if r.get("status") == "taken"]) 
            series.append({"date": day.strftime("%Y-%m-%d"), "adherence": int(round(100 * taken / len(day_rows)))})
        else:
            series.append({"date": day.strftime("%Y-%m-%d"), "adherence": 0})

    # Identify top snooze windows (rough bins)
    def _bin(ts: str) -> str:
        try:
            hh = int(ts[11:13])
        except Exception:
            return "morning"
        if 5 <= hh < 12: return "morning"
        if 12 <= hh < 17: return "midday"
        if 17 <= hh < 21: return "evening"
        return "night"

    try:
        snoozes = [r for r in rows7 if r.get("status") == "snoozed" and r.get("scheduled_at")]
        from collections import Counter
        bins = Counter(_bin(s.get("scheduled_at")) for s in snoozes)
        top_snooze_windows = [b for b,_ in bins.most_common(3)]
    except Exception:
        top_snooze_windows = []
        snoozes = []

    # Miss counts and most-missed block (rough) for last 7 days
    try:
        misses = [
            r for r in rows7
            if r.get("status") in ("skipped", "missed") and r.get("scheduled_at")
        ]
        from collections import Counter
        miss_bins = Counter(_bin(m.get("scheduled_at")) for m in misses)
        top_miss_block = miss_bins.most_common(1)[0][0] if miss_bins else None
        misses_7d = len(misses)
        snoozes_7d = len(snoozes)
    except Exception:
        top_miss_block = None
        misses_7d = None
        snoozes_7d = None

    context = {
        "features": features,
        "recent_days": series,
        "top_snooze_windows": top_snooze_windows,
        "summary": {
            "has_recent_miss": features.get("misses_48h", 0) > 0,
            "snoozes_today": features.get("snoozes_24h", 0),
            "doses_today": features.get("dose_count_today", 0),
            "misses_7d": misses_7d or 0,
            "snoozes_7d": snoozes_7d or 0,
            "top_missed_block": top_miss_block,
        },
    }

    result = await gemini_service.build_risk_insights(context)
    return RiskInsights(
        title=str(result.get("title", "Adherence insights")),
        highlights=list(result.get("highlights", []) or []),
        advice=str(result.get("advice", "")),
        next_best_action=str(result.get("next_best_action", "")),
        misses_7d=misses_7d,
        snoozes_7d=snoozes_7d,
        top_missed_block=top_miss_block,
    )



# Helper function to get current user
def get_current_user_id(claims: dict) -> str:
    return claims.get("sub", "")

async def get_or_create_user(claims: dict) -> str:
    """Get user ID, creating user if doesn't exist"""
    auth0_sub = claims.get("sub", "")
    name = claims.get("name", claims.get("nickname", "Unknown User"))
    
    # Check if user exists
    result = supabase.table("users").select("id").eq("auth0_sub", auth0_sub).execute()
    
    if result.data:
        return result.data[0]["id"]
    
    # Create new user (default to patient role)
    user_data = {
        "auth0_sub": auth0_sub,
        "name": name,
        "role": UserRole.PATIENT.value
    }
    
    result = supabase.table("users").insert(user_data).execute()
    return result.data[0]["id"]


# User management endpoints
@app.get("/api/v1/user/me", response_model=UserResponse)
async def get_current_user(claims: dict = Depends(verify_jwt)):
    user_id = await get_or_create_user(claims)
    
    result = supabase.table("users").select("*").eq("id", user_id).execute()
    user = result.data[0]
    
    return UserResponse(
        id=user["id"],
        auth0_sub=user["auth0_sub"],
        name=user["name"],
        role=user["role"],
        phone_enc=user.get("phone_enc"),
        created_at=user["created_at"]
    )

@app.patch("/api/v1/user/me", response_model=UserResponse)
async def update_current_user(update: UserUpdate, claims: dict = Depends(verify_jwt)):
    user_id = await get_or_create_user(claims)
    update_data = {}
    if update.name is not None:
        update_data["name"] = update.name
    if update.role is not None:
        update_data["role"] = update.role.value
    if update.phone_enc is not None:
        # Accept E.164-like strings; light validation only
        pe = str(update.phone_enc).strip()
        if not pe:
            update_data["phone_enc"] = None
        else:
            update_data["phone_enc"] = pe
    if not update_data:
        # No-op, return current
        result = supabase.table("users").select("*").eq("id", user_id).execute()
        user = result.data[0]
        return UserResponse(
            id=user["id"], auth0_sub=user["auth0_sub"], name=user["name"], role=user["role"], created_at=user["created_at"]
        )
    result = supabase.table("users").update(update_data).eq("id", user_id).execute()
    user = result.data[0]
    return UserResponse(
        id=user["id"], auth0_sub=user["auth0_sub"], name=user["name"], role=user["role"], created_at=user["created_at"]
    )

@app.get("/api/v1/user/next-dose")
async def get_next_dose(claims: dict = Depends(verify_jwt)):
    user_id = await get_or_create_user(claims)
    
    # Use the view created in schema
    result = supabase.rpc("exec_sql", {
        "sql": f"SELECT * FROM v_next_dose WHERE user_id = '{user_id}'"
    }).execute()
    
    if result.data and len(result.data) > 0:
        dose_data = result.data[0]
        # Get medication name
        med_result = supabase.table("medications").select("name").eq("id", dose_data["medication_id"]).execute()
        med_name = med_result.data[0]["name"] if med_result.data else "Unknown"
        
        return {
            "dose_id": dose_data["dose_id"],
            "medication_name": med_name,
            "scheduled_at": dose_data["scheduled_at"]
        }
    
    return {"message": "No pending doses"}


# Medications endpoints
@app.post("/api/v1/medications", response_model=MedicationResponse)
async def create_medication(
    med: MedicationCreate,
    claims: dict = Depends(verify_jwt)
):
    user_id = await get_or_create_user(claims)
    # Basic validation to avoid 500s from DB
    if not med.name or not isinstance(med.times, list) or len([t for t in med.times if t]) == 0:
        raise HTTPException(status_code=400, detail="name and at least one time are required")

    med_times_clean = [t for t in med.times if isinstance(t, str) and t]

    med_data = {
        "user_id": user_id,
        "name": med.name,
        "strength_text": med.strength_text,
        "dose_text": med.dose_text,
        "instructions": med.instructions,
        "frequency_text": med.frequency_text,
    }

    try:
        result = supabase.table("medications").insert(med_data).execute()
        if not result or not getattr(result, "data", None):
            err = getattr(result, "error", None)
            raise Exception(f"Insert medications failed: {err}")
        medication = result.data[0]

        # Add times
        times_data = [
            {"medication_id": medication["id"], "time_of_day": t}
            for t in med_times_clean
        ]
        if times_data:
            t_res = supabase.table("med_times").insert(times_data).execute()
            # Supabase client raises on error; if no data returned, consider it a failure
            if not getattr(t_res, "data", None):
                raise Exception("Insert med_times failed: no data returned")

        return MedicationResponse(
            id=medication["id"],
            name=medication["name"],
            strength_text=medication["strength_text"],
            dose_text=medication["dose_text"],
            instructions=medication["instructions"],
            times=med_times_clean,
            frequency_text=medication.get("frequency_text"),
            created_at=medication["created_at"]
        )
    except HTTPException:
        raise
    except Exception as e:
        # Fallback: some columns may not exist in current schema (e.g., frequency_text or dose_text).
        # Try minimal insert with only required fields, then proceed.
        try:
            minimal = {"user_id": user_id, "name": med.name}
            result2 = supabase.table("medications").insert(minimal).execute()
            if not result2 or not getattr(result2, "data", None):
                err2 = getattr(result2, "error", None)
                raise Exception(f"Minimal insert failed: {err2}")
            medication = result2.data[0]

            # Add times
            med_times_clean = [t for t in med.times if isinstance(t, str) and t]
            if med_times_clean:
                supabase.table("med_times").insert([
                    {"medication_id": medication["id"], "time_of_day": t}
                    for t in med_times_clean
                ]).execute()

            return MedicationResponse(
                id=medication["id"],
                name=medication["name"],
                strength_text=med.strength_text,
                dose_text=med.dose_text,
                instructions=med.instructions,
                times=med_times_clean,
                frequency_text=None,
                created_at=medication["created_at"]
            )
        except Exception as e2:
            raise HTTPException(status_code=500, detail=f"Create medication failed: {str(e2)}")


@app.get("/api/v1/medications", response_model=List[MedicationResponse])
async def get_medications(claims: dict = Depends(verify_jwt)):
    user_id = await get_or_create_user(claims)
    
    # Get medications
    meds_result = supabase.table("medications").select("*").eq("user_id", user_id).execute()
    
    medications = []
    for med in meds_result.data:
        # Get times for this medication
        times_result = supabase.table("med_times").select("time_of_day").eq("medication_id", med["id"]).execute()
        times = [t["time_of_day"] for t in times_result.data]
        
        medications.append(MedicationResponse(
            id=med["id"],
            name=med["name"],
            strength_text=med["strength_text"],
            dose_text=med["dose_text"],
            instructions=med["instructions"],
            times=times,
            frequency_text=med.get("frequency_text"),
            created_at=med["created_at"]
        ))
    
    return medications


@app.delete("/api/v1/medications/{medication_id}")
async def delete_medication(medication_id: str, claims: dict = Depends(verify_jwt)):
    """Delete medication and its times for current user."""
    user_id = await get_or_create_user(claims)
    # Ensure medication belongs to user
    med = supabase.table("medications").select("id").eq("id", medication_id).eq("user_id", user_id).execute()
    if not med.data:
        raise HTTPException(status_code=404, detail="Medication not found")
    # Delete dependent times first
    supabase.table("med_times").delete().eq("medication_id", medication_id).execute()
    # Delete doses associated with this medication (optional cleanup)
    supabase.table("doses").delete().eq("medication_id", medication_id).eq("user_id", user_id).execute()
    # Delete medication
    supabase.table("medications").delete().eq("id", medication_id).eq("user_id", user_id).execute()
    return {"success": True}


# Doses endpoints
@app.post("/api/v1/doses", response_model=DoseResponse)
async def create_dose(
    dose: DoseCreate,
    claims: dict = Depends(verify_jwt)
):
    user_id = await get_or_create_user(claims)
    
    dose_data = {
        "user_id": user_id,
        "medication_id": dose.medication_id,
        "scheduled_at": dose.scheduled_at.isoformat(),
        "status": DoseStatus.PENDING.value,
        "notes": dose.notes
    }
    
    result = supabase.table("doses").insert(dose_data).execute()
    created_dose = result.data[0]
    
    # Get medication name
    med_result = supabase.table("medications").select("name").eq("id", dose.medication_id).execute()
    med_name = med_result.data[0]["name"] if med_result.data else "Unknown"
    
    return DoseResponse(
        id=created_dose["id"],
        medication_id=created_dose["medication_id"],
        scheduled_at=created_dose["scheduled_at"],
        status=created_dose["status"],
        taken_at=created_dose["taken_at"],
        notes=created_dose["notes"],
        medication_name=med_name
    )


@app.get("/api/v1/doses", response_model=List[DoseResponse])
async def get_doses(request: Request, claims: dict = Depends(verify_jwt)):
    user_id = await get_or_create_user(claims)
    # Read user timezone from header; default UTC
    user_tz = request.headers.get("X-User-Timezone", "UTC")

    try:
        # Simple select first (avoid relationship join issues on some PostgREST caches)
        result = (
            supabase
            .table("doses")
            .select("id, medication_id, scheduled_at, status, taken_at, notes")
            .eq("user_id", user_id)
            .order("scheduled_at")
            .execute()
        )

        rows = result.data or []
        medication_ids = sorted({row["medication_id"] for row in rows if row.get("medication_id")})

        id_to_name = {}
        if medication_ids:
            try:
                meds = (
                    supabase
                    .table("medications")
                    .select("id,name")
                    .in_("id", medication_ids)
                    .execute()
                )
                for m in meds.data or []:
                    id_to_name[m["id"]] = m["name"]
            except Exception:
                # Fallback to per-row fetch if IN is not supported in current client
                for mid in medication_ids:
                    try:
                        mres = supabase.table("medications").select("name").eq("id", mid).limit(1).execute()
                        if mres.data:
                            id_to_name[mid] = mres.data[0]["name"]
                    except Exception:
                        pass

        doses: List[DoseResponse] = []
        # Convert scheduled_at/taken_at into user's local time string (ISO) for consistent client behavior
        # We avoid heavy tz libs; keep original ISO but annotate by client side using header when needed.
        for row in rows:
            doses.append(DoseResponse(
                id=row["id"],
                medication_id=row["medication_id"],
                scheduled_at=row["scheduled_at"],
                status=row["status"],
                taken_at=row["taken_at"],
                notes=row["notes"],
                medication_name=id_to_name.get(row["medication_id"], "Unknown"),
            ))

        return doses
    except Exception as e:
        # If anything goes wrong, return an empty list instead of 500 to avoid breaking the dashboard,
        # but surface the error message for debugging.
        try:
            print(f"/api/v1/doses error: {e}")
        except Exception:
            pass
        return []


@app.patch("/api/v1/doses/{dose_id}", response_model=DoseResponse)
async def update_dose(
    dose_id: str,
    dose_update: DoseUpdate,
    claims: dict = Depends(verify_jwt)
):
    user_id = await get_or_create_user(claims)
    
    update_data = {"status": dose_update.status.value}
    if dose_update.taken_at:
        update_data["taken_at"] = dose_update.taken_at.isoformat()
    if dose_update.notes is not None:
        update_data["notes"] = dose_update.notes
    
    result = supabase.table("doses").update(update_data).eq("id", dose_id).eq("user_id", user_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Dose not found")
    
    updated_dose = result.data[0]
    
    # Get medication name
    med_result = supabase.table("medications").select("name").eq("id", updated_dose["medication_id"]).execute()
    med_name = med_result.data[0]["name"] if med_result.data else "Unknown"
    
    return DoseResponse(
        id=updated_dose["id"],
        medication_id=updated_dose["medication_id"],
        scheduled_at=updated_dose["scheduled_at"],
        status=updated_dose["status"],
        taken_at=updated_dose["taken_at"],
        notes=updated_dose["notes"],
        medication_name=med_name
    )


# Alert endpoints
@app.post("/api/v1/alerts/missed-dose")
async def trigger_missed_dose_alert(
    dose_id: str,
    claims: dict = Depends(verify_jwt)
):
    """Trigger missed dose alert to caregivers"""
    user_id = await get_or_create_user(claims)
    
    # Get dose details
    dose_result = supabase.table("doses").select("""
        id, scheduled_at, status, notes,
        medications(name),
        users(name)
    """).eq("id", dose_id).eq("user_id", user_id).execute()
    
    if not dose_result.data:
        raise HTTPException(status_code=404, detail="Dose not found")
    
    dose = dose_result.data[0]
    
    # Mark dose as missed if still pending
    if dose["status"] == "pending":
        supabase.table("doses").update({"status": "missed"}).eq("id", dose_id).execute()
    
    # Get caregivers for this patient
    caregivers_result = supabase.table("caregiver_links").select("""
        caregivers:caregiver_id(name, phone_enc)
    """).eq("patient_id", user_id).execute()
    
    alerts_sent = []
    
    for link in caregivers_result.data:
        caregiver = link["caregivers"]
        if caregiver and caregiver.get("phone_enc"):
            # Send SMS alert
            sms_sid = await sns_service.send_missed_dose_alert(
                caregiver_phone=caregiver["phone_enc"],
                patient_name=dose["users"]["name"],
                medication_name=dose["medications"]["name"],
                scheduled_time=dose["scheduled_at"]
            )
            
            # Log alert
            alert_data = {
                "dose_id": dose_id,
                "ack_by_user_id": caregiver.get("id"),
                "meta": {"sns_message_id": sms_sid, "phone": caregiver["phone_enc"]}
            }
            
            alert_result = supabase.table("alerts").insert(alert_data).execute()
            alerts_sent.append(alert_result.data[0]["id"])
    
    return {
        "success": True,
        "dose_id": dose_id,
        "alerts_sent": len(alerts_sent),
        "alert_ids": alerts_sent
    }


@app.get("/api/v1/alerts/missed-doses")
async def get_missed_doses(claims: dict = Depends(verify_jwt)):
    """Get doses that are overdue and should trigger alerts"""
    user_id = await get_or_create_user(claims)
    
    # Get doses that are past their scheduled time and still pending
    missed_result = supabase.rpc("exec_sql", {
        "sql": f"""
        SELECT d.id, d.scheduled_at, d.status, m.name as medication_name,
               e.grace_minutes
        FROM doses d
        JOIN medications m ON d.medication_id = m.id
        LEFT JOIN escalation_rules e ON d.user_id = e.user_id
        WHERE d.user_id = '{user_id}'
          AND d.status = 'pending'
          AND d.scheduled_at < NOW() - INTERVAL '1 minute' * COALESCE(e.grace_minutes, 10)
        ORDER BY d.scheduled_at
        """
    }).execute()
    
    return {
        "missed_doses": missed_result.data if missed_result.data else [],
        "count": len(missed_result.data) if missed_result.data else 0
    }


@app.post("/api/v1/alerts/acknowledge/{alert_id}")
async def acknowledge_alert(
    alert_id: str,
    claims: dict = Depends(verify_jwt)
):
    """Acknowledge an alert (caregiver confirms they saw it)"""
    user_id = await get_or_create_user(claims)
    
    # Update alert with acknowledgment
    result = supabase.table("alerts").update({
        "ack_by_user_id": user_id,
        "ack_at": datetime.now().isoformat()
    }).eq("id", alert_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    return {"success": True, "acknowledged_at": datetime.now().isoformat()}


@app.post("/api/v1/test/sms")
async def test_sms(
    phone: str,
    claims: dict = Depends(verify_jwt)
):
    """Test SMS functionality"""
    
    # Send test message
    sms_sid = await sns_service.send_reminder_sms(
        patient_phone=phone,
        medication_name="Test Medication",
        time_to_take="Now"
    )
    
    return {
        "success": bool(sms_sid),
        "sms_sid": sms_sid,
        "phone": phone,
        "message": "Test SMS sent!" if sms_sid else "Failed to send SMS"
    }


@app.post("/api/v1/notify/insights")
async def send_insights_sms(claims: dict = Depends(verify_jwt)):
    """Send a concise insights + reminders SMS to the current user using Twilio."""
    user_id = await get_or_create_user(claims)
    # Load user phone
    try:
        ures = supabase.table("users").select("phone_enc,name").eq("id", user_id).single().execute()
        phone = (ures.data or {}).get("phone_enc")
        name = (ures.data or {}).get("name") or "Patient"
    except Exception:
        phone = None
        name = "Patient"
    if not phone:
        raise HTTPException(status_code=400, detail="No phone number on file")

    # Pull insights and risk
    risk = await risk_today(claims)  # reuse handler
    insights = await risk_insights(claims)

    # Build SMS body (160-300 chars preferred)
    parts = [
        f"PillPal: Hi {name.split(' ')[0]}, risk {risk.bucket} ({risk.score_0_100}).",
    ]
    if insights.highlights:
        parts.append(insights.highlights[0][:120])
    if insights.next_best_action:
        parts.append(f"Try: {insights.next_best_action[:100]}")
    body = " \n".join(parts)

    sid = await sns_service.send_text(phone, body)
    if not sid:
        raise HTTPException(status_code=500, detail="SMS not sent. Check AWS SNS credentials and configuration.")
    return {"success": True, "sid": sid}


@app.get("/api/v1/export/adherence.csv")
async def export_adherence_csv(claims: dict = Depends(verify_jwt)):
    """Export all doses for the user as CSV: id,medication_name,scheduled_at,status,taken_at,notes"""
    user_id = await get_or_create_user(claims)
    try:
        doses_res = (
            supabase
            .table("doses")
            .select("id, medication_id, scheduled_at, status, taken_at, notes")
            .eq("user_id", user_id)
            .order("scheduled_at")
            .execute()
        )
        rows = doses_res.data or []
        med_ids = sorted({r.get("medication_id") for r in rows if r.get("medication_id")})
        names = {}
        if med_ids:
            meds = supabase.table("medications").select("id,name").in_("id", med_ids).execute()
            for m in meds.data or []:
                names[m["id"]] = m["name"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch data: {e}")

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["id", "medication_name", "scheduled_at", "status", "taken_at", "notes"])
    for r in rows:
        writer.writerow([
            r.get("id"),
            names.get(r.get("medication_id"), "Unknown"),
            r.get("scheduled_at"),
            r.get("status"),
            r.get("taken_at"),
            (r.get("notes") or "").replace("\n", " ").strip(),
        ])
    buf.seek(0)
    headers = {"Content-Disposition": "attachment; filename=adherence.csv"}
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv", headers=headers)


