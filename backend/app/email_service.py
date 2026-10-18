"""Provider-neutral SMTP delivery for security OTP messages.

Configuration is read for every delivery attempt so values loaded from
``backend/.env`` (or injected by the hosting platform) are never frozen at
module-import time. Gmail App Password and OAuth2 are both supported.
"""

from __future__ import annotations

import base64
import html
import json
import logging
import os
import smtplib
import ssl
from dataclasses import dataclass
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from dotenv import load_dotenv


logger = logging.getLogger(__name__)
load_dotenv(Path(__file__).resolve().parents[1] / ".env")


def _as_bool(value: str | None, default: bool) -> bool:
    if value is None or value.strip() == "":
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _mask_email(value: str) -> str:
    local, separator, domain = value.partition("@")
    if not separator:
        return "invalid-address"
    visible = local[:2] if len(local) > 2 else local[:1]
    return f"{visible}***@{domain}"


@dataclass(frozen=True)
class SMTPConfig:
    host: str
    port: int
    username: str
    password: str
    from_email: str
    from_name: str
    use_ssl: bool
    use_starttls: bool
    timeout_seconds: int
    auth_mode: str
    oauth2_access_token: str
    oauth2_client_id: str
    oauth2_client_secret: str
    oauth2_refresh_token: str
    oauth2_token_url: str

    @classmethod
    def from_environment(cls) -> "SMTPConfig":
        host = os.getenv("SMTP_HOST", "smtp.gmail.com").strip()
        port = int(os.getenv("SMTP_PORT", "587"))
        username = (
            os.getenv("SMTP_USERNAME")
            or os.getenv("SMTP_EMAIL")
            or os.getenv("EMAIL_USER")
            or ""
        ).strip()
        password = (os.getenv("SMTP_PASSWORD") or os.getenv("EMAIL_PASS") or "").strip()
        if "gmail.com" in host.lower():
            password = password.replace(" ", "")
        use_ssl = _as_bool(os.getenv("SMTP_USE_SSL"), port == 465)
        use_starttls = _as_bool(os.getenv("SMTP_STARTTLS"), not use_ssl)
        return cls(
            host=host,
            port=port,
            username=username,
            password=password,
            from_email=(os.getenv("SMTP_FROM_EMAIL") or username).strip(),
            from_name=os.getenv("SMTP_FROM_NAME", "Campus InfoHub").strip(),
            use_ssl=use_ssl,
            use_starttls=use_starttls,
            timeout_seconds=int(os.getenv("SMTP_TIMEOUT_SECONDS", "15")),
            auth_mode=os.getenv("SMTP_AUTH_MODE", "password").strip().lower(),
            oauth2_access_token=os.getenv("SMTP_OAUTH2_ACCESS_TOKEN", "").strip(),
            oauth2_client_id=os.getenv("SMTP_OAUTH2_CLIENT_ID", "").strip(),
            oauth2_client_secret=os.getenv("SMTP_OAUTH2_CLIENT_SECRET", "").strip(),
            oauth2_refresh_token=os.getenv("SMTP_OAUTH2_REFRESH_TOKEN", "").strip(),
            oauth2_token_url=os.getenv(
                "SMTP_OAUTH2_TOKEN_URL", "https://oauth2.googleapis.com/token"
            ).strip(),
        )

    def validation_error(self) -> str | None:
        if not self.host or not self.username or not self.from_email:
            return "SMTP host, username, and sender email are required."
        if self.auth_mode not in {"password", "oauth2"}:
            return "SMTP_AUTH_MODE must be password or oauth2."
        if self.auth_mode == "password" and not self.password:
            return "SMTP_PASSWORD is missing. For Gmail, use a Google App Password."
        if self.auth_mode == "oauth2" and not (
            self.oauth2_access_token
            or (
                self.oauth2_client_id
                and self.oauth2_client_secret
                and self.oauth2_refresh_token
            )
        ):
            return "OAuth2 credentials are incomplete."
        return None


def get_email_configuration_status() -> dict:
    """Return non-secret SMTP diagnostics safe for an admin/status response."""
    config = SMTPConfig.from_environment()
    error = config.validation_error()
    return {
        "configured": error is None,
        "host": config.host,
        "port": config.port,
        "auth_mode": config.auth_mode,
        "sender": _mask_email(config.from_email) if config.from_email else None,
        "use_ssl": config.use_ssl,
        "use_starttls": config.use_starttls,
        "configuration_error": error,
    }


def is_email_configured() -> bool:
    return SMTPConfig.from_environment().validation_error() is None


def _oauth2_access_token(config: SMTPConfig) -> str:
    if config.oauth2_access_token:
        return config.oauth2_access_token
    body = urlencode(
        {
            "client_id": config.oauth2_client_id,
            "client_secret": config.oauth2_client_secret,
            "refresh_token": config.oauth2_refresh_token,
            "grant_type": "refresh_token",
        }
    ).encode("utf-8")
    request = Request(
        config.oauth2_token_url,
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    with urlopen(request, timeout=config.timeout_seconds) as response:
        payload = json.loads(response.read().decode("utf-8"))
    token = payload.get("access_token")
    if not token:
        raise RuntimeError("OAuth2 token endpoint did not return an access token.")
    return token


def _authenticate(server: smtplib.SMTP, config: SMTPConfig) -> None:
    if config.auth_mode == "oauth2":
        token = _oauth2_access_token(config)
        auth_string = f"user={config.username}\x01auth=Bearer {token}\x01\x01"
        encoded = base64.b64encode(auth_string.encode("utf-8")).decode("ascii")
        code, response = server.docmd("AUTH", "XOAUTH2 " + encoded)
        if code != 235:
            raise smtplib.SMTPAuthenticationError(code, response)
    else:
        server.login(config.username, config.password)


def _connect_and_send_smtp(config: SMTPConfig, to_email: str, message: str) -> bool:
    context = ssl.create_default_context()
    try:
        if config.use_ssl:
            server = smtplib.SMTP_SSL(
                config.host,
                config.port,
                timeout=config.timeout_seconds,
                context=context,
            )
        else:
            server = smtplib.SMTP(config.host, config.port, timeout=config.timeout_seconds)

        try:
            server.ehlo()
            if config.use_starttls and not config.use_ssl:
                server.starttls(context=context)
                server.ehlo()
            _authenticate(server, config)
            server.sendmail(config.from_email, [to_email], message)
        finally:
            try:
                server.quit()
            except Exception:
                server.close()
        logger.info("SMTP delivery succeeded recipient=%s", _mask_email(to_email))
        return True
    except smtplib.SMTPAuthenticationError:
        logger.error(
            "SMTP authentication failed host=%s auth_mode=%s recipient=%s",
            config.host,
            config.auth_mode,
            _mask_email(to_email),
        )
    except (smtplib.SMTPException, OSError, TimeoutError) as exc:
        logger.error(
            "SMTP delivery failed host=%s port=%s error_type=%s recipient=%s",
            config.host,
            config.port,
            type(exc).__name__,
            _mask_email(to_email),
        )
    except Exception as exc:
        logger.error(
            "Unexpected email delivery failure error_type=%s recipient=%s",
            type(exc).__name__,
            _mask_email(to_email),
        )
    return False


def send_email(to_email: str, subject: str, plain: str, html_body: str) -> bool:
    """Send a transactional email using the same validated SMTP transport."""
    config = SMTPConfig.from_environment()
    configuration_error = config.validation_error()
    if configuration_error:
        logger.error("Email delivery is not configured: %s", configuration_error)
        return False

    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = f"{config.from_name} <{config.from_email}>"
    message["To"] = to_email
    message.attach(MIMEText(plain, "plain", "utf-8"))
    message.attach(MIMEText(html_body, "html", "utf-8"))
    return _connect_and_send_smtp(config, to_email, message.as_string())


def send_registration_decision_email(
    to_email: str,
    user_name: str,
    decision: str,
    reason: str | None = None,
    email_verified: bool = False,
) -> bool:
    """Send an approval/rejection decision without changing account state."""
    normalized = decision.strip().lower()
    safe_name = html.escape(user_name or "Community Member")
    if normalized == "approved":
        subject = "Your College Community Hub Registration Has Been Approved"
        activation = (
            "Your account is active, and you can now sign in."
            if email_verified
            else "Please complete email verification before signing in."
        )
        plain = (
            f"Dear {user_name},\n\nCongratulations! Your registration for College Community Hub "
            f"has been reviewed and approved.\n\n{activation}\n\nRegards,\nCollege Community Hub Team"
        )
        html_body = f"""
        <!doctype html><html><body style="font-family:Arial,sans-serif;color:#334155;background:#f8fafc;padding:24px">
          <div style="max-width:560px;margin:auto;background:#fff;padding:32px;border-radius:16px;border:1px solid #e2e8f0">
            <h1 style="color:#047857">Registration approved</h1>
            <p>Dear {safe_name},</p>
            <p>Congratulations! Your College Community Hub registration has been reviewed and approved.</p>
            <p>{html.escape(activation)}</p>
            <p>Regards,<br>College Community Hub Team</p>
          </div>
        </body></html>"""
    elif normalized == "rejected":
        safe_reason = html.escape(reason or "The submitted information could not be verified.")
        subject = "Update on Your College Community Hub Registration"
        plain = (
            f"Dear {user_name},\n\nYour registration request was reviewed but could not be approved.\n\n"
            f"Reason: {reason or 'The submitted information could not be verified.'}\n\n"
            "Please review the reason and resubmit your application if permitted.\n\n"
            "Regards,\nCollege Community Hub Team"
        )
        html_body = f"""
        <!doctype html><html><body style="font-family:Arial,sans-serif;color:#334155;background:#f8fafc;padding:24px">
          <div style="max-width:560px;margin:auto;background:#fff;padding:32px;border-radius:16px;border:1px solid #e2e8f0">
            <h1 style="color:#be123c">Registration update</h1>
            <p>Dear {safe_name},</p>
            <p>Your registration request was reviewed but could not be approved.</p>
            <p><strong>Reason:</strong> {safe_reason}</p>
            <p>Please correct the information and resubmit your application if permitted.</p>
            <p>Regards,<br>College Community Hub Team</p>
          </div>
        </body></html>"""
    else:
        raise ValueError("Decision must be approved or rejected.")

    return send_email(to_email, subject, plain, html_body)


def send_otp_email(to_email: str, otp: str, purpose: str = "PASSWORD_RESET") -> bool:
    """Send a six-digit verification code without logging credentials or OTPs."""
    normalized_purpose = (purpose or "").strip().upper()
    is_verification = normalized_purpose == "EMAIL_VERIFICATION"
    subject = "Email Verification Code - Campus InfoHub" if is_verification else "Password Reset Code - Campus InfoHub"
    title = "Verify Your Email Address" if is_verification else "Reset Your Password"
    explanation = (
        "Use this code to verify your Campus InfoHub email address."
        if is_verification
        else "Use this code to continue resetting your Campus InfoHub password."
    )

    plain = f"{title}\n\n{explanation}\n\nVerification code: {otp}\n\nThis code expires in 5 minutes."
    html = f"""
    <!doctype html>
    <html><body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#334155">
      <div style="max-width:480px;margin:32px auto;background:#fff;padding:32px;border:1px solid #e2e8f0;border-radius:18px">
        <p style="color:#b45309;font-weight:700;text-align:center">CAMPUS INFOHUB</p>
        <h1 style="font-size:24px;text-align:center;color:#0f172a">{title}</h1>
        <p style="line-height:1.6;text-align:center">{explanation}</p>
        <div style="font:700 36px monospace;letter-spacing:8px;text-align:center;color:#b45309;background:#fef3c7;padding:18px;border-radius:12px">{otp}</div>
        <p style="font-size:13px;text-align:center;color:#64748b">This code expires in 5 minutes. If you did not request it, ignore this email.</p>
      </div>
    </body></html>
    """
    return send_email(to_email, subject, plain, html)
