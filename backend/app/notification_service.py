"""Database notification helpers with idempotent event keys."""
from . import models


def _add_once(db, **values):
    event_key = values.get("event_key")
    if event_key and db.query(models.Notification).filter(models.Notification.event_key == event_key).first():
        return None
    notification = models.Notification(**values)
    db.add(notification)
    return notification


def notify_admins(db, text, notif_type, event_key, action_url=None, entity_type=None, entity_id=None):
    admins = db.query(models.Admin).all()
    for admin in admins:
        _add_once(
            db,
            admin_id=admin.id,
            recipient_role="admin",
            text=text,
            type=notif_type,
            event_key=f"{event_key}:admin:{admin.id}",
            action_url=action_url,
            entity_type=entity_type,
            entity_id=entity_id,
        )


def notify_admin(db, admin_id, text, notif_type, event_key, action_url=None, entity_type=None, entity_id=None):
    """Notify one administrator without colliding with a student of the same numeric ID."""
    return _add_once(
        db,
        admin_id=admin_id,
        recipient_role="admin",
        text=text,
        type=notif_type,
        event_key=event_key,
        action_url=action_url,
        entity_type=entity_type,
        entity_id=entity_id,
    )


def notify_user(db, user_id, text, notif_type, event_key, action_url=None, entity_type=None, entity_id=None):
    return _add_once(
        db,
        user_id=user_id,
        recipient_role="user",
        text=text,
        type=notif_type,
        event_key=event_key,
        action_url=action_url,
        entity_type=entity_type,
        entity_id=entity_id,
    )


def notify_students(db, text, notif_type, event_key, action_url=None, entity_type=None, entity_id=None, exclude_user_id=None):
    students = db.query(models.Student).filter(
        models.Student.role == "Student",
        models.Student.status == "Active",
    ).all()
    for student in students:
        if exclude_user_id is not None and student.id == exclude_user_id:
            continue
        notify_user(
            db, student.id, text, notif_type, f"{event_key}:student:{student.id}",
            action_url, entity_type, entity_id,
        )
