"""
Internal Campus Mail Router
Endpoints for sending, receiving, and managing internal messages between users.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas, database
from ..dependencies import get_current_user_from_token

router = APIRouter(prefix="/mail", tags=["Internal Mail"])


def _get_student_db(db: Session, user) -> models.Student:
    """Helper: ensure current user is a Student (not Admin)."""
    if isinstance(user, models.Admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admins cannot use the internal mail system."
        )
    return db.query(models.Student).filter(models.Student.id == user.id).first()


# ── Inbox ─────────────────────────────────────────────────────────────────────

@router.get("/inbox", response_model=List[schemas.InternalMessageOut])
def get_inbox(
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user_from_token),
):
    """Fetch all messages sent TO the current user (not deleted)."""
    _get_student_db(db, current_user)
    messages = (
        db.query(models.InternalMessage)
        .filter(
            models.InternalMessage.recipient_id == current_user.id,
            models.InternalMessage.recipient_deleted == False,
        )
        .order_by(models.InternalMessage.created_at.desc())
        .all()
    )
    return messages


# ── Sent ──────────────────────────────────────────────────────────────────────

@router.get("/sent", response_model=List[schemas.InternalMessageOut])
def get_sent(
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user_from_token),
):
    """Fetch all messages sent BY the current user (not deleted)."""
    _get_student_db(db, current_user)
    messages = (
        db.query(models.InternalMessage)
        .filter(
            models.InternalMessage.sender_id == current_user.id,
            models.InternalMessage.sender_deleted == False,
        )
        .order_by(models.InternalMessage.created_at.desc())
        .all()
    )
    return messages


# ── Starred ───────────────────────────────────────────────────────────────────

@router.get("/starred", response_model=List[schemas.InternalMessageOut])
def get_starred(
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user_from_token),
):
    """Fetch all starred messages for the current user."""
    _get_student_db(db, current_user)
    messages = (
        db.query(models.InternalMessage)
        .filter(
            (models.InternalMessage.recipient_id == current_user.id) |
            (models.InternalMessage.sender_id == current_user.id),
            models.InternalMessage.is_starred == True,
        )
        .order_by(models.InternalMessage.created_at.desc())
        .all()
    )
    return messages


# ── Send ──────────────────────────────────────────────────────────────────────

@router.post("/send", response_model=schemas.InternalMessageOut, status_code=status.HTTP_201_CREATED)
def send_message(
    payload: schemas.InternalMessageCreate,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user_from_token),
):
    """Send an internal message to another user identified by email."""
    _get_student_db(db, current_user)

    # Resolve recipient
    recipient = db.query(models.Student).filter(
        models.Student.email == payload.recipient_email
    ).first()
    if not recipient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No user found with email '{payload.recipient_email}'"
        )
    if recipient.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot send a message to yourself."
        )

    msg = models.InternalMessage(
        sender_id=current_user.id,
        recipient_id=recipient.id,
        subject=payload.subject,
        body=payload.body,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


# ── Mark as Read ──────────────────────────────────────────────────────────────

@router.put("/{message_id}/read")
def mark_as_read(
    message_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user_from_token),
):
    """Mark a message as read (only by recipient)."""
    msg = db.query(models.InternalMessage).filter(
        models.InternalMessage.id == message_id,
        models.InternalMessage.recipient_id == current_user.id,
    ).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    msg.is_read = True
    db.commit()
    return {"message": "Marked as read"}


# ── Toggle Star ───────────────────────────────────────────────────────────────

@router.put("/{message_id}/star")
def toggle_star(
    message_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user_from_token),
):
    """Toggle starred status for a message."""
    msg = db.query(models.InternalMessage).filter(
        models.InternalMessage.id == message_id,
        (models.InternalMessage.recipient_id == current_user.id) |
        (models.InternalMessage.sender_id == current_user.id),
    ).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    msg.is_starred = not msg.is_starred
    db.commit()
    return {"starred": msg.is_starred}


# ── Delete (soft) ─────────────────────────────────────────────────────────────

@router.delete("/{message_id}")
def delete_message(
    message_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user_from_token),
):
    """Soft-delete a message from the current user's view."""
    msg = db.query(models.InternalMessage).filter(
        models.InternalMessage.id == message_id,
    ).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    if msg.recipient_id == current_user.id:
        msg.recipient_deleted = True
    elif msg.sender_id == current_user.id:
        msg.sender_deleted = True
    else:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Hard-delete if both sides deleted
    if msg.sender_deleted and msg.recipient_deleted:
        db.delete(msg)
    db.commit()
    return {"message": "Message deleted"}
