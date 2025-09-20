import os
from typing import Optional
from twilio.rest import Client
from dotenv import load_dotenv

load_dotenv()

class TwilioService:
    def __init__(self):
        self.account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        self.auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        self.from_number = os.getenv("TWILIO_FROM_NUMBER")
        self.messaging_service_sid = os.getenv("TWILIO_MESSAGING_SERVICE_SID")
        
        if self.account_sid and self.auth_token:
            self.client = Client(self.account_sid, self.auth_token)
        else:
            self.client = None
    
    async def send_missed_dose_alert(
        self,
        caregiver_phone: str,
        patient_name: str,
        medication_name: str,
        scheduled_time: str
    ) -> Optional[str]:
        """Send SMS alert to caregiver about missed dose"""
        
        if not self.client or not self.from_number:
            print("Twilio not configured - would send SMS alert")
            return None
        
        message_body = f"""
🚨 PillPal Alert

{patient_name} missed their medication:
💊 {medication_name}
⏰ Scheduled: {scheduled_time}

Please check on them.
        """.strip()
        
        try:
            # Use messaging service if available, otherwise fall back to from_number
            message_params = {
                "body": message_body,
                "to": caregiver_phone
            }
            
            if self.messaging_service_sid:
                message_params["messaging_service_sid"] = self.messaging_service_sid
            else:
                message_params["from_"] = self.from_number
            
            message = self.client.messages.create(**message_params)
            return message.sid
        except Exception as e:
            print(f"Failed to send SMS: {e}")
            return None
    
    async def send_reminder_sms(
        self,
        patient_phone: str,
        medication_name: str,
        time_to_take: str
    ) -> Optional[str]:
        """Send reminder SMS to patient"""
        
        if not self.client or not self.from_number:
            print("Twilio not configured - would send reminder SMS")
            return None
        
        message_body = f"""
💊 PillPal Reminder

Time to take your {medication_name}
⏰ {time_to_take}

Reply 'TAKEN' when you've taken it.
        """.strip()
        
        try:
            # Use messaging service if available, otherwise fall back to from_number
            message_params = {
                "body": message_body,
                "to": patient_phone
            }
            
            if self.messaging_service_sid:
                message_params["messaging_service_sid"] = self.messaging_service_sid
            else:
                message_params["from_"] = self.from_number
            
            message = self.client.messages.create(**message_params)
            return message.sid
        except Exception as e:
            print(f"Failed to send reminder SMS: {e}")
            return None

# Global instance
twilio_service = TwilioService()
