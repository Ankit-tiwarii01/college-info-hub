from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas, database
from ..dependencies import get_current_user_from_token

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"]
)

@router.get("/", response_model=List[schemas.Notification])
def get_notifications(
    db: Session = Depends(database.get_db),
    current_user: models.Student = Depends(get_current_user_from_token)
):
    if isinstance(current_user, models.Admin):
        notifications = db.query(models.Notification).filter(
            models.Notification.admin_id == current_user.id
        ).all()
    else:
        notifications = db.query(models.Notification).filter(models.Notification.user_id == current_user.id).all()
    # Sort by created_at desc (newest first) - assuming ID is roughly chronological for now or use created_at if available
    # The schema has created_at, but let's just reverse the list or order by id desc
    return sorted(notifications, key=lambda x: x.id, reverse=True)

@router.put("/read-all")
def mark_all_read(
    db: Session = Depends(database.get_db),
    current_user: models.Student = Depends(get_current_user_from_token)
):
    query = db.query(models.Notification)
    if isinstance(current_user, models.Admin):
        query = query.filter(models.Notification.admin_id == current_user.id)
    else:
        query = query.filter(models.Notification.user_id == current_user.id)
    query.update({"read": True}, synchronize_session=False)
    db.commit()
    return {"message": "All notifications marked as read"}


@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user_from_token),
):
    query = db.query(models.Notification).filter(models.Notification.read.is_(False))
    if isinstance(current_user, models.Admin):
        query = query.filter(models.Notification.admin_id == current_user.id)
    else:
        query = query.filter(models.Notification.user_id == current_user.id)
    return {"unread_count": query.count()}


@router.put("/{notification_id}/read")
def mark_read(
    notification_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user_from_token),
):
    query = db.query(models.Notification).filter(models.Notification.id == notification_id)
    if isinstance(current_user, models.Admin):
        query = query.filter(models.Notification.admin_id == current_user.id)
    else:
        query = query.filter(models.Notification.user_id == current_user.id)
    notification = query.first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    notification.read = True
    db.commit()
    return {"message": "Notification marked as read"}
