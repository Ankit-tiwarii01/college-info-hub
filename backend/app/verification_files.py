"""Validation and private storage for registration identity documents."""
from pathlib import Path
import uuid

from fastapi import HTTPException, UploadFile


MAX_DOCUMENT_SIZE = 5 * 1024 * 1024
ALLOWED_DOCUMENTS = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".pdf": "application/pdf",
}


def _matches_signature(contents: bytes, extension: str) -> bool:
    if extension in {".jpg", ".jpeg"}:
        return contents.startswith(b"\xff\xd8\xff")
    if extension == ".png":
        return contents.startswith(b"\x89PNG\r\n\x1a\n")
    if extension == ".pdf":
        return contents.startswith(b"%PDF-")
    return False


async def save_private_document(upload: UploadFile, category: str) -> tuple[str, str, str]:
    if not upload or not upload.filename:
        raise HTTPException(status_code=400, detail="A verification document is required.")

    extension = Path(upload.filename).suffix.lower()
    expected_mime = ALLOWED_DOCUMENTS.get(extension)
    if not expected_mime or upload.content_type != expected_mime:
        raise HTTPException(status_code=400, detail="Only genuine JPG, JPEG, PNG, or PDF documents are accepted.")

    contents = await upload.read(MAX_DOCUMENT_SIZE + 1)
    if not contents:
        raise HTTPException(status_code=400, detail="The uploaded verification document is empty.")
    if len(contents) > MAX_DOCUMENT_SIZE:
        raise HTTPException(status_code=413, detail="Verification documents must not exceed 5 MB.")
    if not _matches_signature(contents, extension):
        raise HTTPException(status_code=400, detail="The uploaded file content does not match its file type.")

    root = Path(__file__).resolve().parents[1] / "private_uploads" / "verification" / category
    root.mkdir(parents=True, exist_ok=True)
    destination = root / f"{uuid.uuid4().hex}{extension}"
    destination.write_bytes(contents)
    return str(destination.resolve()), Path(upload.filename).name, expected_mime


def ensure_private_document(path: str | None) -> Path:
    if not path:
        raise HTTPException(status_code=404, detail="Verification document not found.")
    root = (Path(__file__).resolve().parents[1] / "private_uploads" / "verification").resolve()
    candidate = Path(path).resolve()
    try:
        candidate.relative_to(root)
    except ValueError as exc:
        raise HTTPException(status_code=403, detail="Invalid document location.") from exc
    if not candidate.is_file():
        raise HTTPException(status_code=404, detail="Verification document not found.")
    return candidate


def delete_private_document(path: str | None) -> bool:
    if not path:
        return False
    try:
        candidate = ensure_private_document(path)
    except HTTPException as exc:
        if exc.status_code == 404:
            return False
        raise
    candidate.unlink()
    return True


async def save_public_profile_photo(upload: UploadFile | None) -> str | None:
    if not upload or not upload.filename:
        return None
    extension = Path(upload.filename).suffix.lower()
    if extension not in {".jpg", ".jpeg", ".png"}:
        raise HTTPException(status_code=400, detail="Profile photos must be JPG, JPEG, or PNG.")
    expected_mime = "image/png" if extension == ".png" else "image/jpeg"
    if upload.content_type != expected_mime:
        raise HTTPException(status_code=400, detail="Profile photo type does not match its extension.")
    contents = await upload.read(2 * 1024 * 1024 + 1)
    if len(contents) > 2 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Profile photos must not exceed 2 MB.")
    if not _matches_signature(contents, extension):
        raise HTTPException(status_code=400, detail="The profile photo content is invalid.")
    root = Path(__file__).resolve().parents[1] / "uploads" / "profile_photos"
    root.mkdir(parents=True, exist_ok=True)
    destination = root / f"profile_{uuid.uuid4().hex}{extension}"
    destination.write_bytes(contents)
    return f"/uploads/profile_photos/{destination.name}"


def delete_public_profile_photo(public_path: str | None) -> bool:
    """Delete only profile images stored inside the public uploads directory."""
    if not public_path or not public_path.startswith("/uploads/"):
        return False
    uploads_root = (Path(__file__).resolve().parents[1] / "uploads").resolve()
    relative = public_path.removeprefix("/uploads/")
    candidate = (uploads_root / relative).resolve()
    try:
        candidate.relative_to(uploads_root)
    except ValueError:
        return False
    if not candidate.is_file():
        return False
    candidate.unlink()
    return True
