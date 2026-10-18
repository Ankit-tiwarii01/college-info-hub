"""Timezone-aware helpers for date-only job application deadlines."""
import os
from datetime import date, datetime, timedelta, timezone
from datetime import tzinfo
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


DEFAULT_APP_TIMEZONE = "Asia/Kolkata"


def application_timezone() -> tzinfo:
    timezone_name = os.getenv("APP_TIMEZONE", DEFAULT_APP_TIMEZONE).strip() or DEFAULT_APP_TIMEZONE
    try:
        return ZoneInfo(timezone_name)
    except ZoneInfoNotFoundError:
        # Windows installations may not ship the IANA timezone database.
        # India does not observe DST, so UTC+05:30 is an exact safe fallback.
        return timezone(timedelta(hours=5, minutes=30), name="Asia/Kolkata")


def application_today() -> date:
    return datetime.now(application_timezone()).date()


def deadline_has_passed(deadline: date | None) -> bool:
    # A date-only deadline remains open through 11:59:59 PM in the configured
    # application timezone, so it expires only when the local date advances.
    return bool(deadline and deadline < application_today())


def remaining_days(deadline: date | None) -> int | None:
    if deadline is None:
        return None
    return max(0, (deadline - application_today()).days)
