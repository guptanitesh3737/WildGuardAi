"""
services/risk_engine.py
Wildlife Risk Classification
"""

SPECIES_RISK_DB = {
    "Snow Leopard":    {"risk": "CRITICAL", "habitat": "High Himalaya (3000–5500m)", "population": "~450 in Nepal", "wwf_priority": True},
    "Bengal Tiger":    {"risk": "CRITICAL", "habitat": "Terai Forest / Chitwan", "population": "~235 in Nepal", "wwf_priority": True},
    "One-Horned Rhino":{"risk": "HIGH",     "habitat": "Chitwan & Bardia NP", "population": "~752 in Nepal", "wwf_priority": True},
    "Red Panda":       {"risk": "HIGH",     "habitat": "Eastern Hills (1800–4000m)", "population": "~1,000 estimated", "wwf_priority": True},
    "Gharial":         {"risk": "HIGH",     "habitat": "Narayani & Karnali Rivers", "population": "~200 globally", "wwf_priority": True},
    "Himalayan Wolf":  {"risk": "MODERATE", "habitat": "Upper Mustang / Trans-Himalaya", "population": "~350 estimated", "wwf_priority": False},
    "Musk Deer":       {"risk": "MODERATE", "habitat": "Annapurna Buffer Zone", "population": "Declining", "wwf_priority": False},
    "Wild Boar":       {"risk": "LOW",      "habitat": "Forest Buffer Zones", "population": "Stable", "wwf_priority": False},
}

class RiskEngine:
    def classify(self, species: str) -> dict:
        return SPECIES_RISK_DB.get(species, {
            "risk": "MODERATE",
            "habitat": "Unknown",
            "population": "Data deficient",
            "wwf_priority": False,
        })


"""
services/alert_service.py
Multi-channel Alert Dispatcher (SMS + Email)
"""

import os
import asyncio
import logging

logger = logging.getLogger("wildguard.alerts")

class AlertService:
    def __init__(self):
        self.twilio_sid = os.getenv("TWILIO_SID")
        self.twilio_token = os.getenv("TWILIO_TOKEN")
        self.alert_phone = os.getenv("ALERT_PHONE", "+977XXXXXXXXXX")
        self.from_phone = os.getenv("TWILIO_FROM", "+1XXXXXXXXXX")
        self.sendgrid_key = os.getenv("SENDGRID_KEY")
        self.alert_email = os.getenv("ALERT_EMAIL", "rangers@wwfnepal.org")

    async def send_sms(self, message: str) -> bool:
        """Send SMS alert via Twilio."""
        if not self.twilio_sid or not self.twilio_token:
            logger.warning("[DEMO] SMS alert (Twilio not configured): " + message[:80])
            return True
        try:
            from twilio.rest import Client
            client = Client(self.twilio_sid, self.twilio_token)
            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: client.messages.create(
                    body=message,
                    from_=self.from_phone,
                    to=self.alert_phone
                )
            )
            logger.info(f"SMS sent to {self.alert_phone}")
            return True
        except Exception as e:
            logger.error(f"SMS failed: {e}")
            return False

    async def send_email(self, subject: str, body: str) -> bool:
        """Send email alert via SendGrid."""
        if not self.sendgrid_key:
            logger.warning(f"[DEMO] Email alert (SendGrid not configured): {subject}")
            return True
        try:
            import sendgrid
            from sendgrid.helpers.mail import Mail
            sg = sendgrid.SendGridAPIClient(api_key=self.sendgrid_key)
            mail = Mail(
                from_email="alerts@wildguard.app",
                to_emails=self.alert_email,
                subject=subject,
                plain_text_content=body,
            )
            await asyncio.get_event_loop().run_in_executor(None, sg.send, mail)
            logger.info(f"Email sent: {subject}")
            return True
        except Exception as e:
            logger.error(f"Email failed: {e}")
            return False
