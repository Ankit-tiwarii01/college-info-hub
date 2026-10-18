from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas, database
from ..dependencies import get_current_user_from_token
from ..verification_files import delete_public_profile_photo, save_public_profile_photo

def user_response(user):
    result = schemas.User.model_validate(user)
    result.role = "admin" if isinstance(user, models.Admin) else str(user.role).lower()
    if isinstance(user, models.Admin):
        result.status = "Active"
    return result


router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=schemas.User)
async def read_users_me(
    current_user=Depends(get_current_user_from_token),
):
    """Return the currently authenticated user's profile."""
    return user_response(current_user)


@router.put("/me", response_model=schemas.User)
def update_user_me(
    user_update: schemas.UserUpdate,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user_from_token),
):
    """Update the currently authenticated user's profile fields."""
    if isinstance(current_user, models.Admin):
        user = db.query(models.Admin).filter(models.Admin.id == current_user.id).first()
    else:
        user = db.query(models.Student).filter(models.Student.id == current_user.id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = user_update.dict(exclude_unset=True)

    profile_fields = {
        "bio", "skills", "location", "current_company", "designation", "previous_company",
        "linkedin", "github", "instagram", "facebook", "x_twitter", "portfolio",
    }
    if "avatar" in update_data:
        raise HTTPException(status_code=400, detail="Use the profile photo upload or remove action to change your picture.")
    user_fields = set(update_data.keys()) - profile_fields

    # Update Student/Admin table fields
    for key in user_fields:
        if hasattr(user, key):
            setattr(user, key, update_data[key])

    # Update StudentProfile fields (not applicable for admins)
    if not isinstance(user, models.Admin) and any(f in update_data for f in profile_fields):
        if not user.profile:
            user.profile = models.StudentProfile(student_id=user.id)

        for key in profile_fields:
            if key in update_data:
                setattr(user.profile, key, update_data[key])

        if str(user.role).lower() == "alumni":
            alumnus = db.query(models.Alumni).filter(func.lower(models.Alumni.email) == user.email.lower()).first()
            if alumnus:
                for key in {"linkedin", "github", "instagram", "facebook", "x_twitter", "portfolio"}:
                    if key in update_data:
                        setattr(alumnus, key, update_data[key])

    db.commit()
    db.refresh(user)

    return user_response(user)


@router.put("/me/profile-photo", response_model=schemas.User)
async def update_profile_photo(
    profile_photo: UploadFile = File(...),
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user_from_token),
):
    """Upload a public profile photo while keeping verification documents private."""
    if isinstance(current_user, models.Admin):
        raise HTTPException(status_code=403, detail="Administrator profile photos are not supported here.")
    user = db.query(models.Student).filter(models.Student.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    new_path = await save_public_profile_photo(profile_photo)
    if not user.profile:
        user.profile = models.StudentProfile(student_id=user.id)
    old_path = user.profile.avatar
    user.profile.avatar = new_path
    if str(user.role).lower() == "alumni":
        alumnus = db.query(models.Alumni).filter(func.lower(models.Alumni.email) == user.email.lower()).first()
        if alumnus:
            alumnus.professional_picture = new_path
    db.commit()
    db.refresh(user)
    if old_path and old_path != new_path:
        delete_public_profile_photo(old_path)
    return user_response(user)


@router.delete("/me/profile-photo", response_model=schemas.User)
def remove_profile_photo(
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user_from_token),
):
    if isinstance(current_user, models.Admin):
        raise HTTPException(status_code=403, detail="Administrator profile photos are not supported here.")
    user = db.query(models.Student).filter(models.Student.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    old_path = user.profile.avatar if user.profile else None
    if user.profile:
        user.profile.avatar = None
    if str(user.role).lower() == "alumni":
        alumnus = db.query(models.Alumni).filter(func.lower(models.Alumni.email) == user.email.lower()).first()
        if alumnus:
            alumnus.professional_picture = None
    db.commit()
    db.refresh(user)
    delete_public_profile_photo(old_path)
    return user_response(user)


@router.get("/me/stats", response_model=schemas.UserStats)
def get_my_stats(
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user_from_token),
):
    """Return real activity counts for the currently authenticated user."""
    if isinstance(current_user, models.Admin):
        raise HTTPException(status_code=403, detail="Admins do not have personal stats.")

    posts_count = db.query(models.Post).filter(
        models.Post.user_id == current_user.id
    ).count()

    applications_count = db.query(models.JobApplication).filter(
        models.JobApplication.student_id == current_user.id
    ).count()

    mentorships_count = db.query(models.MentorshipRequest).filter(
        (models.MentorshipRequest.student_id == current_user.id) |
        (models.MentorshipRequest.mentor_id == current_user.id)
    ).count()

    events_count = db.query(models.EventAttendee).filter(
        models.EventAttendee.student_id == current_user.id
    ).count()

    return {
        "posts_count": posts_count,
        "applications_count": applications_count,
        "mentorships_count": mentorships_count,
        "events_count": events_count,
    }


@router.get("/{user_id}", response_model=schemas.User)
def read_user(user_id: int, db: Session = Depends(database.get_db)):
    """Retrieve a user's public profile by ID."""
    db_user = db.query(models.Student).filter(models.Student.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user
