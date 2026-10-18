from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone
from .. import models, schemas, database
from ..dependencies import get_current_user_from_token
from .. import notification_service

router = APIRouter(
    prefix="/posts",
    tags=["Posts"]
)

def _is_admin(user):
    return isinstance(user, models.Admin)


def _actor_key(user):
    return f"admin:{user.id}" if _is_admin(user) else f"user:{user.id}"


def _owns_post(post, user):
    return post.admin_id == user.id if _is_admin(user) else post.user_id == user.id


def _feed_url_for_role(role, post_id):
    normalized = str(role or "student").lower()
    prefix = "admin" if normalized == "admin" else ("alumni" if normalized == "alumni" else "student")
    return f"/{prefix}/feed?post={post_id}"


def _notify_post_author(db, post, actor, text, notif_type, event_key):
    if post.admin_id is not None:
        if _is_admin(actor) and actor.id == post.admin_id:
            return None
        return notification_service.notify_admin(
            db, post.admin_id, text, notif_type, event_key,
            _feed_url_for_role("admin", post.id), "post", post.id,
        )
    if post.user_id is not None:
        if not _is_admin(actor) and actor.id == post.user_id:
            return None
        role = post.user.role if post.user else "Student"
        return notification_service.notify_user(
            db, post.user_id, text, notif_type, event_key,
            _feed_url_for_role(role, post.id), "post", post.id,
        )
    return None


def require_visible(post, user):
    if not post or (not post.is_approved and not _is_admin(user) and not _owns_post(post, user)):
        raise HTTPException(status_code=404, detail="Post not found")


def require_approved(post):
    if not post or not post.is_approved or str(post.approval_status).lower() != "approved":
        raise HTTPException(status_code=404, detail="Post not found")


# --------------------------------------------------------------------------- #
# Public Feed — only approved posts
# --------------------------------------------------------------------------- #

@router.get("/", response_model=List[schemas.Post])
def read_posts(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(database.get_db),
    current_user: models.Student = Depends(get_current_user_from_token)
):
    """Return approved posts plus current user's own pending posts for the feed."""
    is_admin = _is_admin(current_user)
    if is_admin:
        posts = (
            db.query(models.Post)
            .order_by(models.Post.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
    else:
        posts = (
            db.query(models.Post)
            .filter(
                ((models.Post.approval_status == "Approved") & (models.Post.is_approved == True))
                | (models.Post.user_id == current_user.id)
            )
            .order_by(models.Post.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
    return posts


@router.post("/", response_model=schemas.Post)
def create_post(
    post: schemas.PostCreate,
    db: Session = Depends(database.get_db),
    current_user: models.Student = Depends(get_current_user_from_token)
):
    """Create a post. Standard user posts start as unapproved. Admin posts are auto-approved."""
    is_admin = _is_admin(current_user)
    if is_admin:
        db_post = models.Post(
            **post.dict(),
            user_id=None,
            admin_id=current_user.id,
            is_approved=True,
            approval_status="Approved",
            approved_at=datetime.now(timezone.utc),
            approved_by=getattr(current_user, "name", "System Admin")
        )
    else:
        db_post = models.Post(
            **post.dict(), user_id=current_user.id, is_approved=False,
            approval_status="Pending", rejection_reason=None,
        )

    db.add(db_post)
    db.flush()
    if not is_admin:
        notification_service.notify_admins(
            db,
            f"{current_user.name} submitted a new {str(current_user.role).lower()} post for review.",
            "post_pending",
            f"post-pending:{db_post.id}",
            f"/admin/pending?tab=posts&post={db_post.id}",
            "post",
            db_post.id,
        )
    db.commit()
    db.refresh(db_post)
    return db_post


@router.put("/{post_id}", response_model=schemas.Post)
def update_post(
    post_id: int,
    payload: schemas.PostCreate,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user_from_token),
):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    is_admin = _is_admin(current_user)
    if not is_admin and not _owns_post(post, current_user):
        raise HTTPException(status_code=403, detail="Not authorized to edit this post")
    post.content = payload.content
    post.image = payload.image
    post.type = payload.type
    if not is_admin:
        post.is_approved = False
        post.approval_status = "Pending"
        post.approved_at = None
        post.approved_by = None
        post.rejection_reason = None
        notification_service.notify_admins(
            db,
            f"{current_user.name} edited a post; it requires approval again.",
            "post_pending",
            f"post-revision:{post.id}:{datetime.utcnow().isoformat()}",
            "/admin/pending",
            "post",
            post.id,
        )
    db.commit()
    db.refresh(post)
    return post


@router.get("/my", response_model=List[schemas.Post])
def read_my_posts(
    db: Session = Depends(database.get_db),
    current_user: models.Student = Depends(get_current_user_from_token)
):
    """A user can view all their own posts, including unapproved ones."""
    is_admin = _is_admin(current_user)
    if is_admin:
        return (
            db.query(models.Post)
            .filter(models.Post.admin_id == current_user.id)
            .order_by(models.Post.created_at.desc())
            .all()
        )
    return (
        db.query(models.Post)
        .filter(models.Post.user_id == current_user.id)
        .order_by(models.Post.created_at.desc())
        .all()
    )


@router.get("/{post_id}", response_model=schemas.Post)
def read_post(post_id: int, db: Session = Depends(database.get_db), current_user=Depends(get_current_user_from_token)):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    require_visible(post, current_user)
    return post


@router.post("/{post_id}/comments", response_model=schemas.Comment)
def create_comment(
    post_id: int,
    comment: schemas.CommentCreate,
    db: Session = Depends(database.get_db),
    current_user: models.Student = Depends(get_current_user_from_token)
):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    require_approved(post)

    is_admin = _is_admin(current_user)
    if is_admin:
        db_comment = models.Comment(**comment.dict(), post_id=post_id, user_id=None, admin_id=current_user.id)
    else:
        db_comment = models.Comment(**comment.dict(), post_id=post_id, user_id=current_user.id)

    db.add(db_comment)
    db.flush()
    preview = comment.text.strip()
    if len(preview) > 80:
        preview = preview[:77] + "..."
    _notify_post_author(
        db, post, current_user,
        f"{current_user.name} commented on your post: {preview}",
        "post_comment", f"post-comment:{post.id}:{db_comment.id}",
    )
    db.commit()
    db.refresh(db_comment)
    return db_comment


@router.post("/{post_id}/like")
def like_post(
    post_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.Student = Depends(get_current_user_from_token)
):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    require_approved(post)

    is_admin = _is_admin(current_user)
    actor_filter = (
        models.PostLike.admin_id == current_user.id
        if is_admin else models.PostLike.user_id == current_user.id
    )
    existing_like = db.query(models.PostLike).filter(models.PostLike.post_id == post_id, actor_filter).first()

    if existing_like:
        # Toggle: unlike if already liked
        db.delete(existing_like)
        db.flush()
        post.likes_count = db.query(models.PostLike).filter(models.PostLike.post_id == post_id).count()
        db.commit()
        return {"message": "Post unliked", "liked": False, "likes_count": post.likes_count, "actor_key": _actor_key(current_user)}

    new_like = models.PostLike(
        post_id=post_id,
        admin_id=current_user.id if is_admin else None,
        user_id=None if is_admin else current_user.id,
    )
    db.add(new_like)
    db.flush()
    post.likes_count = db.query(models.PostLike).filter(models.PostLike.post_id == post_id).count()
    _notify_post_author(
        db, post, current_user, f"{current_user.name} liked your post.",
        "post_like", f"post-like:{post.id}:{_actor_key(current_user)}:{datetime.now(timezone.utc).isoformat()}",
    )
    db.commit()
    return {"message": "Post liked", "liked": True, "likes_count": post.likes_count, "actor_key": _actor_key(current_user)}


@router.delete("/{post_id}")
def delete_post(
    post_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.Student = Depends(get_current_user_from_token)
):
    """Delete a post (by author or admin)."""
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    require_visible(post, current_user)

    is_admin = _is_admin(current_user)
    if not is_admin and not _owns_post(post, current_user):
        raise HTTPException(status_code=403, detail="Not authorized to delete this post.")

    db.delete(post)
    db.commit()
    return {"message": "Post deleted successfully"}
