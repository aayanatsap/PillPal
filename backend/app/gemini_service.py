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

    async def parse_voice_intent(self, voice_query: str) -> Dict[str, Any]:
        prompt = f"""
You are a medication assistant. Parse this voice query and extract intent and relevant data.

Voice query: "{voice_query}"

Respond with JSON in this exact format:
{{
  "intent": "one of: next_dose, take_dose, skip_dose, add_medication, unknown",
  "confidence": 0.0-1.0,
  "entities": {{
    "medication_name": "if mentioned",
    "time": "if mentioned",
    "dosage": "if mentioned"
  }},
  "suggested_response": "helpful response to user"
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
            h = int(re.search(r"every\s+(\d+)\s+hours", s).group(1))
            frequency_text = f"Every {h} hours"
        elif re.search(r"q\d+h", s):
            h = int(re.search(r"q(\d+)h", s).group(1))
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
                h = int(re.search(r"Every\s+(\d+)\s+hours", frequency_text).group(1))
                cur = datetime.strptime("08:00", "%H:%M")
                for _ in range(24 // h):
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


gemini_service = GeminiService()
