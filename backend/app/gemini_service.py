import os
import json
import re
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)


class GeminiService:
    def __init__(self):
        self.model_vision = genai.GenerativeModel(
            'gemini-1.5-flash',
            generation_config={"response_mime_type": "application/json", "temperature": 0.2}
        )
        self.model_text = genai.GenerativeModel(
            'gemini-1.5-flash',
            generation_config={"response_mime_type": "application/json", "temperature": 0.2}
        )

    async def parse_voice_intent(self, voice_query: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        ctx_json = "{}"
        try:
            if context is not None:
                import json as _json
                ctx_json = _json.dumps(context)
        except Exception:
            ctx_json = "{}"

        prompt = f"""
You are PillPal, a warm and brief medication assistant.

Context (JSON):
{ctx_json}

User asked (natural language): "{voice_query}"

Use the context (medications, times, next dose) to ground your answer.
Return JSON exactly in this shape:
{{
  "intent": "one of: next_dose, take_dose, skip_dose, add_medication, unknown",
  "confidence": 0.0-1.0,
  "entities": {{
    "medication_name": "if mentioned or inferred",
    "time": "if a time window is referenced",
    "dosage": "if referenced"
  }},
  "suggested_response": "A short, spoken-friendly reply for TTS"
}}
"""
        try:
            response = self.model_text.generate_content(prompt)
            return json.loads(response.text)
        except Exception as e:
            return {
                "intent": "unknown",
                "confidence": 0.0,
                "entities": {},
                "suggested_response": f"I'm having trouble understanding that. Could you try again? (Error: {str(e)})"
            }

    def _parse_frequency_and_times(self, instructions: str) -> Dict[str, Any]:
        frequency_text: Optional[str] = None
        times: List[str] = []
        s = (instructions or "").lower()

        if "once daily" in s or "qd" in s or "every day" in s or "daily" in s:
            frequency_text = "Once daily"
        elif "twice daily" in s or "bid" in s or re.search(r"morning.*evening|evening.*morning", s):
            frequency_text = "Twice daily"
        elif "three times" in s or "tid" in s:
            frequency_text = "Three times daily"
        elif "four times" in s or "qid" in s:
            frequency_text = "Four times daily"
        elif re.search(r"every\s+\d+\s+hours", s):
            m = re.search(r"every\s+(\d+)\s+hours", s)
            if m:
                h = int(m.group(1))
                frequency_text = f"Every {h} hours"
        elif re.search(r"q\d+h", s):
            m = re.search(r"q(\d+)h", s)
            if m:
                h = int(m.group(1))
                frequency_text = f"Every {h} hours"

        # explicit HH:MM
        times += sorted(list({m for m in re.findall(r"\b(\d{1,2}:\d{2})\b", instructions or "")}))

        if "morning" in s or "breakfast" in s:
            times.append("08:00")
        if "noon" in s or "lunch" in s:
            times.append("12:00")
        if "evening" in s or "dinner" in s:
            times.append("18:00")
        if "bedtime" in s or "night" in s:
            times.append("21:00")

        if frequency_text and not times:
            if frequency_text == "Once daily":
                times = ["09:00"]
            elif frequency_text == "Twice daily":
                times = ["09:00", "21:00"]
            elif frequency_text == "Three times daily":
                times = ["08:00", "14:00", "20:00"]
            elif frequency_text == "Four times daily":
                times = ["06:00", "12:00", "18:00", "00:00"]
            elif frequency_text.startswith("Every"):
                m = re.search(r"Every\s+(\d+)\s+hours", frequency_text)
                if m:
                    h = int(m.group(1))
                    cur = datetime.strptime("08:00", "%H:%M")
                    for _ in range(max(1, 24 // max(1, h))):
                        times.append(cur.strftime("%H:%M"))
                        cur += timedelta(hours=h)

        times = sorted(list({t for t in times}))
        return {"frequency_text": frequency_text, "times": times}

    async def extract_medication_from_label(self, image_data: bytes, mime_type: str) -> Dict[str, Any]:
        prompt_parts = [
            { 'mime_type': mime_type or 'image/jpeg', 'data': image_data },
            """
You are a highly accurate pharmacy label reader. Extract ALL medications with fields:
- name
- strength_text
- instructions
- frequency_text (infer if needed)
- confidence (0-1)
Return JSON as {"medications": [...]} only.
"""
        ]
        try:
            response = self.model_vision.generate_content(prompt_parts)
            raw = response.text.strip()
            if raw.startswith("```json") and raw.endswith("```"):
                raw = raw[7:-3].strip()
            data = json.loads(raw)
            processed = []
            for med in data.get("medications", []):
                instr = med.get("instructions", "")
                timing = self._parse_frequency_and_times(instr)
                if not med.get("frequency_text") and timing.get("frequency_text"):
                    med["frequency_text"] = timing["frequency_text"]
                med["times"] = timing.get("times", [])
                processed.append({
                    "name": med.get("name"),
                    "strength_text": med.get("strength_text"),
                    "instructions": med.get("instructions"),
                    "frequency_text": med.get("frequency_text"),
                    "times": med.get("times", []),
                    "confidence": med.get("confidence", 0.0)
                })
            return {"medications": processed}
        except Exception as e:
            return {"medications": [], "error": f"Failed to extract medication info: {str(e)}"}


    async def score_adherence_risk(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """Use Gemini to produce a 0-100 risk score with rationale and suggestion.
        Returns a dict shaped like RiskOut.
        """
        instruction = (
            "You are a careful healthcare assistant that estimates the near-term risk that a patient will "
            "miss a scheduled medication dose within the next 24 hours.\n"
            "Return a calibrated score from 0 to 100 (higher = higher risk), a risk bucket, a 1–2 sentence "
            "rationale, and one actionable suggestion.\n"
            "Use only the numeric features provided. Do not invent data. Keep output concise and machine-readable.\n"
            "Calibration guidance:\n"
            "- Strong adherence (adherence_7d ≥ 0.9) should rarely exceed 35 unless there are recent misses/snoozes or many doses today.\n"
            "- Recent misses_48h ≥ 1 or snoozes_24h ≥ 2 should push risk above 45 depending on context.\n"
            "- Evening/night windows are slightly higher risk than morning for most users.\n"
            "- Larger dose_count_today and higher complexity increase risk.\n"
            "- caregiver_ack_7d > 0 raises risk by 10–20 depending on recency.\n"
            "Output only JSON with keys: score_0_100, bucket (low|medium|high), rationale, suggestion, contributing_factors."
        )
        payload = {"features": features}
        try:
            response = self.model_text.generate_content([
                instruction,
                {"text": json.dumps(payload)},
            ])
            raw = (response.text or "").strip()
            if raw.startswith("```json") and raw.endswith("```"):
                raw = raw[7:-3].strip()
            data = json.loads(raw)
            # Minimal coercion/validation
            score = int(max(0, min(100, int(round(float(data.get("score_0_100", 0)))))))
            bucket = str(data.get("bucket", "low")).lower()
            if bucket not in ("low", "medium", "high"):
                bucket = "low"
            rationale = str(data.get("rationale", ""))
            suggestion = str(data.get("suggestion", ""))
            contributing = data.get("contributing_factors", []) or []
            if not isinstance(contributing, list):
                contributing = []
            return {
                "score_0_100": score,
                "bucket": bucket,
                "rationale": rationale,
                "suggestion": suggestion,
                "contributing_factors": contributing,
            }
        except Exception as e:
            return {
                "error": f"gemini_risk_failed: {e}",
            }

    async def build_risk_insights(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Create a concise insight card: what is being missed, frequency pattern, and tailored advice.
        Expects context keys: features (dict), recent_days (array of {date, adherence}), top_snooze_windows (array of strings),
        and summary strings without PHI.
        Returns: { title, highlights: [string], advice: string, next_best_action: string }
        """
        instruction = (
            "You are helping a caregiver support a patient's medication adherence. Using only the provided derived stats,\n"
            "write a compact insight card with:\n"
            "- title: a short headline (4-7 words)\n"
            "- highlights: 2-4 bullet strings describing what's being missed and when (no PHI)\n"
            "- advice: one paragraph (<= 2 sentences) with empathetic guidance\n"
            "- next_best_action: a concrete, single next step\n"
            "Keep it specific to the patterns in the data. No invented details. Output JSON only."
        )
        try:
            response = self.model_text.generate_content([
                instruction,
                {"text": json.dumps(context)},
            ])
            raw = (response.text or "").strip()
            if raw.startswith("```json") and raw.endswith("```"):
                raw = raw[7:-3].strip()
            data = json.loads(raw)
            return {
                "title": str(data.get("title", "Adherence insights")),
                "highlights": list(data.get("highlights", []))[:4] if isinstance(data.get("highlights", []), list) else [],
                "advice": str(data.get("advice", "")),
                "next_best_action": str(data.get("next_best_action", "")),
            }
        except Exception:
            return {
                "title": "Adherence insights",
                "highlights": ["Recent missed or snoozed doses detected"],
                "advice": "Consider enabling earlier reminders and reducing snoozes.",
                "next_best_action": "Enable a 15-minute earlier reminder window for evening doses",
            }

gemini_service = GeminiService()
