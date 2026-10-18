"""Secure OTP creation and validation shared by registration and password reset."""
import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import func

from . import models, utils

OTP_EXPIRY_MINUTES = int(os.getenv("OTP_EXPIRY_MINUTES", "5"))
OTP_RESEND_COOLDOWN_SECONDS = int(os.getenv("OTP_RESEND_COOLDOWN_SECONDS", "60"))
OTP_MAX_SENDS = int(os.getenv("OTP_MAX_SENDS", "5"))
OTP_MAX_ATTEMPTS = 5


def _now():
    return datetime.now(timezone.utc)


def hash_otp(destination: str, purpose: str, code: str) -> str:
    message = f"{destination.strip().lower()}|{purpose.upper()}|{code}".encode()
    return hmac.new(utils.SECRET_KEY.encode(), message, hashlib.sha256).hexdigest()


def _matches(record: models.OTP, code: str) -> bool:
    if record.otp_hash:
        expected = hash_otp(record.email, record.purpose, code)
        return hmac.compare_digest(record.otp_hash, expected)
    # One-time compatibility for OTPs created before the secure-hash migration.
    return hmac.compare_digest(record.otp or "", code)


def issue_otp(db, destination: str, purpose: str, channel: str) -> tuple[str, models.OTP]:
    destination = destination.strip().lower()
    purpose = purpose.upper()
    channel = channel.lower()
    latest = (
        db.query(models.OTP)
        .filter(
            func.lower(models.OTP.email) == destination,
            models.OTP.purpose == purpose,
            models.OTP.channel == channel,
        )
        .order_by(models.OTP.created_at.desc())
        .first()
    )
    now = _now()
    if latest and latest.last_sent_at:
        sent_at = latest.last_sent_at
        if sent_at.tzinfo is None:
            sent_at = sent_at.replace(tzinfo=timezone.utc)
        wait = OTP_RESEND_COOLDOWN_SECONDS - int((now - sent_at).total_seconds())
        if wait > 0 and not latest.is_used:
            raise HTTPException(status_code=429, detail=f"Please wait {wait} seconds before requesting another OTP.")

    sent_today = db.query(models.OTP).filter(
        func.lower(models.OTP.email) == destination,
        models.OTP.purpose == purpose,
        models.OTP.channel == channel,
        models.OTP.created_at >= now - timedelta(hours=24),
    ).count()
    if sent_today >= OTP_MAX_SENDS:
        raise HTTPException(status_code=429, detail="OTP resend limit reached. Please try again after 24 hours.")

    db.query(models.OTP).filter(
        func.lower(models.OTP.email) == destination,
        models.OTP.purpose == purpose,
        models.OTP.channel == channel,
        models.OTP.is_used == False,
    ).update({"is_used": True}, synchronize_session=False)

    code = f"{secrets.randbelow(1000000):06d}"
    record = models.OTP(
        email=destination,
        otp="HASHED",
        otp_hash=hash_otp(destination, purpose, code),
        channel=channel,
        purpose=purpose,
        attempts=0,
        sent_count=1,
        is_used=False,
        expires_at=now + timedelta(minutes=OTP_EXPIRY_MINUTES),
        last_sent_at=now,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return code, record


def invalidate(record: models.OTP, db):
    record.is_used = True
    db.commit()


def verify_otp(db, destination: str, purpose: str, channel: str, code: str, consume: bool = True) -> models.OTP:
    destination = destination.strip().lower()
    record = (
        db.query(models.OTP)
        .filter(
            func.lower(models.OTP.email) == destination,
            models.OTP.purpose == purpose.upper(),
            models.OTP.channel == channel.lower(),
            models.OTP.is_used == False,
        )
        .order_by(models.OTP.created_at.desc())
        .first()
    )
    if not record:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired OTP. Please request a new code.")

    record.attempts = (record.attempts or 0) + 1
    expires_at = record.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if _now() > expires_at:
        record.is_used = True
        db.commit()
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new code.")
    if record.attempts > OTP_MAX_ATTEMPTS or not _matches(record, code.strip()):
        if record.attempts >= OTP_MAX_ATTEMPTS:
            record.is_used = True
        db.commit()
        remaining = max(0, OTP_MAX_ATTEMPTS - record.attempts)
        raise HTTPException(status_code=400, detail=f"Incorrect OTP. {remaining} attempt(s) remaining.")

    if consume:
        record.is_used = True
    db.commit()
    return record
