import os
import boto3
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

class SNSService:
    def __init__(self):
        self.aws_access_key_id = os.getenv("AWS_ACCESS_KEY_ID")
        self.aws_secret_access_key = os.getenv("AWS_SECRET_ACCESS_KEY")
        self.aws_region = os.getenv("AWS_REGION", "us-east-1")
        
        if self.aws_access_key_id and self.aws_secret_access_key:
            self.client = boto3.client(
                'sns',
                aws_access_key_id=self.aws_access_key_id,
                aws_secret_access_key=self.aws_secret_access_key,
                region_name=self.aws_region
            )
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
        
        if not self.client:
            print("AWS SNS not configured - would send SMS alert")
            return None
        
        message_body = f"""🚨 PillPal Alert

{patient_name} missed their medication:
💊 {medication_name}
⏰ Scheduled: {scheduled_time}

Please check on them."""
        
        try:
            response = self.client.publish(
                PhoneNumber=caregiver_phone,
                Message=message_body
            )
            return response.get('MessageId')
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
        
        if not self.client:
            print("AWS SNS not configured - would send reminder SMS")
            return None
        
        message_body = f"""💊 PillPal Reminder

Time to take your {medication_name}
⏰ {time_to_take}

Reply 'TAKEN' when you've taken it."""
        
        try:
            response = self.client.publish(
                PhoneNumber=patient_phone,
                Message=message_body
            )
            return response.get('MessageId')
        except Exception as e:
            print(f"Failed to send reminder SMS: {e}")
            return None

    async def send_text(self, to: str, body: str) -> Optional[str]:
        """Send a generic SMS message."""
        if not self.client:
            print("AWS SNS not configured - would send SMS:", body[:120])
            return None
        
        try:
            response = self.client.publish(
                PhoneNumber=to,
                Message=body
            )
            return response.get('MessageId')
        except Exception as e:
            print(f"Failed to send SMS: {e}")
            return None

    async def send_insights_sms(self, to: str, body: str) -> Optional[str]:
        """Send insights SMS message - alias for send_text for compatibility"""
        return await self.send_text(to, body)

# Global instance
sns_service = SNSService()
