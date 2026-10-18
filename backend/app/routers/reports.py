from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from .. import models, schemas, database
from ..dependencies import get_current_user_from_token

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.post("/", response_model=schemas.Report)
def create_report(
    report: schemas.ReportCreate,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user_from_token)
):
    """
    Allow students and alumni to report any ID, user, post, or issue with optional description & image.
    """
    target_str = (report.target_identifier or (str(report.target_id) if report.target_id else "")).strip()
    if not target_str:
        raise HTTPException(status_code=400, detail="Reported Target ID, Reg No, or Email is required.")
        
    target_id_num = report.target_id
    if not target_id_num and target_str.isdigit():
        target_id_num = int(target_str)

    db_report = models.Report(
        reporter_id=current_user.id,
        target_id=target_id_num,
        target_identifier=target_str,
        target_type=report.target_type or "User",
        reason=report.reason,
        description=report.description or "",
        image_url=report.image_url or None,
        status="Pending"
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)

    return {
        "id": db_report.id,
        "reporter_id": db_report.reporter_id,
        "reporter_name": getattr(current_user, 'name', 'User'),
        "reporter_email": getattr(current_user, 'email', ''),
        "target_id": db_report.target_id,
        "target_identifier": db_report.target_identifier,
        "target_type": db_report.target_type,
        "reason": db_report.reason,
        "description": db_report.description,
        "image_url": db_report.image_url,
        "status": db_report.status,
        "action_taken": db_report.action_taken,
        "created_at": db_report.created_at,
    }

