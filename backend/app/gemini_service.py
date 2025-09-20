import os
import json
from typing import Dict, Any, Optional
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

class GeminiService:
    def __init__(self):
        self.model = genai.GenerativeModel('gemini-1.5-flash')
    
    async def parse_voice_intent(self, voice_query: str) -> Dict[str, Any]:
        """Parse voice query for medication-related intent"""
        
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

Common intents:
- "What do I take now?" -> next_dose
- "I took my pills" -> take_dose
- "Skip this dose" -> skip_dose
- "Add new medication" -> add_medication

Be conversational and helpful in your suggested_response.
"""
        
        try:
            response = self.model.generate_content(prompt)
            result = json.loads(response.text)
            return result
        except Exception as e:
            return {
                "intent": "unknown",
                "confidence": 0.0,
                "entities": {},
                "suggested_response": f"I'm having trouble understanding that. Could you try again? (Error: {str(e)})"
            }
    
    async def extract_medication_from_label(self, image_data: bytes) -> Dict[str, Any]:
        """Extract medication information from prescription label image"""
        
        prompt = """
You are a pharmacy label reader. Extract medication information from this prescription label image.

Respond with JSON in this exact format:
{
  "medication_name": "drug name",
  "strength": "dosage strength like '500mg'",
  "directions": "how to take it",
  "quantity": "number of pills/tablets",
  "prescriber": "doctor name if visible",
  "pharmacy": "pharmacy name if visible",
  "confidence": 0.0-1.0,
  "warnings": ["any important warnings or notes"]
}

Be very careful to extract accurate information. If something is unclear, note low confidence.
"""
        
        try:
            # Convert bytes to the format Gemini expects
            import PIL.Image
            import io
            image = PIL.Image.open(io.BytesIO(image_data))
            
            response = self.model.generate_content([prompt, image])
            result = json.loads(response.text)
            return result
        except Exception as e:
            return {
                "medication_name": None,
                "strength": None,
                "directions": None,
                "quantity": None,
                "prescriber": None,
                "pharmacy": None,
                "confidence": 0.0,
                "warnings": [f"Error processing image: {str(e)}"]
            }

# Global instance
gemini_service = GeminiService()
