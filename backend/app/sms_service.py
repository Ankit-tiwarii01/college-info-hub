"""Twilio SMS delivery. No development or hard-coded OTP fallback is permitted."""
import base64
import logging
import os
from urllib import parse, request

logger = logging.getLogger(__name__)


def is_sms_configured() -> bool:
    return all(os.getenv(key) for key in ("TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"))


def normalize_phone(phone: str) -> str:
    clean = "".join(ch for ch in (phone or "") if ch.isdigit() or ch == "+")
    if clean.startswith("+"):
        return clean
    if len(clean) == 10:
        return f"+91{clean}"
    return f"+{clean}"


def send_otp_sms(phone: str, otp: str) -> bool:
    if not is_sms_configured():
        logger.error("SMS OTP delivery is not configured. Set Twilio environment variables.")
        return False
    sid = os.environ["TWILIO_ACCOUNT_SID"]
    token = os.environ["TWILIO_AUTH_TOKEN"]
    from_number = os.environ["TWILIO_FROM_NUMBER"]
    url = f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"
    payload = parse.urlencode({
        "To": normalize_phone(phone),
        "From": from_number,
        "Body": f"Your Campus InfoHub verification code is {otp}. It expires in 5 minutes.",
    }).encode()
    credentials = base64.b64encode(f"{sid}:{token}".encode()).decode()
    req = request.Request(url, data=payload, method="POST", headers={
        "Authorization": f"Basic {credentials}",
        "Content-Type": "application/x-www-form-urlencoded",
    })
    try:
        with request.urlopen(req, timeout=15) as response:
            return 200 <= response.status < 300
    except Exception as exc:
        logger.error("Twilio SMS delivery failed: %s", exc)
        return False
