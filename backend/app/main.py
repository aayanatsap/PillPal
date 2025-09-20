from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, time
import os
from .security import verify_jwt
from .database import get_db, supabase
from .models import User, Medication, MedTime, Dose, DoseStatus, UserRole
from .gemini_service import gemini_service
from .twilio_service import twilio_service
from sqlalchemy.orm import Session

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
    created_at: datetime

class MedicationCreate(BaseModel):
    name: str
    strength_text: Optional[str] = None
    dose_text: Optional[str] = None
    instructions: Optional[str] = None
    times: List[str] = []  # ["08:00", "20:00"]

class MedicationResponse(BaseModel):
    id: str
    name: str
    strength_text: Optional[str]
    dose_text: Optional[str]
    instructions: Optional[str]
    times: List[str]
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
    
    # Use Gemini to parse intent
    result = await gemini_service.parse_voice_intent(body.query)
    
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
        result = await gemini_service.extract_medication_from_label(image_data)
        
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
            "medication_info": result,
            "suggestions": {
                "create_medication": result.get("confidence", 0) > 0.7,
                "review_required": result.get("confidence", 0) < 0.8
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")


@app.get("/api/v1/risk")
async def risk_for_user(_claims: dict = Depends(verify_jwt)):
    # TODO: compute risk via simple logistic regression
    return {"score": 0}


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
        created_at=user["created_at"]
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
    
    # Use Supabase client for CRUD (simpler than SQLAlchemy for this hackathon)
    med_data = {
        "user_id": user_id,
        "name": med.name,
        "strength_text": med.strength_text,
        "dose_text": med.dose_text,
        "instructions": med.instructions
    }
    
    result = supabase.table("medications").insert(med_data).execute()
    medication = result.data[0]
    
    # Add times
    times_data = [
        {"medication_id": medication["id"], "time_of_day": t}
        for t in med.times
    ]
    if times_data:
        supabase.table("med_times").insert(times_data).execute()
    
    return MedicationResponse(
        id=medication["id"],
        name=medication["name"],
        strength_text=medication["strength_text"],
        dose_text=medication["dose_text"],
        instructions=medication["instructions"],
        times=med.times,
        created_at=medication["created_at"]
    )


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
            created_at=med["created_at"]
        ))
    
    return medications


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
async def get_doses(claims: dict = Depends(verify_jwt)):
    user_id = await get_or_create_user(claims)
    
    # Get doses with medication names
    result = supabase.table("doses").select("""
        id, medication_id, scheduled_at, status, taken_at, notes,
        medications(name)
    """).eq("user_id", user_id).order("scheduled_at").execute()
    
    doses = []
    for dose in result.data:
        doses.append(DoseResponse(
            id=dose["id"],
            medication_id=dose["medication_id"],
            scheduled_at=dose["scheduled_at"],
            status=dose["status"],
            taken_at=dose["taken_at"],
            notes=dose["notes"],
            medication_name=dose["medications"]["name"] if dose["medications"] else "Unknown"
        ))
    
    return doses


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
            sms_sid = await twilio_service.send_missed_dose_alert(
                caregiver_phone=caregiver["phone_enc"],
                patient_name=dose["users"]["name"],
                medication_name=dose["medications"]["name"],
                scheduled_time=dose["scheduled_at"]
            )
            
            # Log alert
            alert_data = {
                "dose_id": dose_id,
                "ack_by_user_id": caregiver.get("id"),
                "meta": {"twilio_sid": sms_sid, "phone": caregiver["phone_enc"]}
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
    sms_sid = await twilio_service.send_reminder_sms(
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


