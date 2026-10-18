"""Single source of truth for registration approval and account activation."""

from . import models


def sync_account_status(user: models.Student) -> str:
    """Apply the email-verification + admin-decision activation matrix.

    ``verification_status`` is the administrator decision and ``status`` is
    the operational account state used by authentication/authorization.
    Phone verification remains available, but is not an activation gate.
    """
    approval = str(user.verification_status or "pending").strip().lower()

    if approval == "rejected":
        user.status = "Rejected"
    elif approval == "suspended":
        user.status = "Blocked"
    elif approval == "approved" and bool(user.email_verified):
        user.status = "Active"
    else:
        user.status = "Pending"

    return user.status


def sync_alumni_record(db, user: models.Student) -> None:
    """Keep the optional alumni-directory record aligned with login state."""
    if str(user.role or "").strip().lower() != "alumni":
        return
    alumnus = (
        db.query(models.Alumni)
        .filter(models.Alumni.email.ilike(user.email))
        .first()
    )
    if not alumnus:
        return
    alumnus.email_verified = bool(user.email_verified)
    alumnus.phone_verified = bool(user.phone_verified)
    alumnus.status = user.status
    alumnus.rejection_reason = user.rejection_reason
