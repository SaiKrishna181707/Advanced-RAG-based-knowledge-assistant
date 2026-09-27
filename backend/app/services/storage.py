"""
Uploaded-file storage.

Files are written to local disk under ``UPLOAD_FOLDER/<user_id>/``. This module is
the single seam that must change to move to cloud object storage: callers only ever
deal with a ``StoredUpload`` and an opaque ``stored_name``.
"""
from __future__ import annotations

import hashlib
import logging
import mimetypes
import os
import uuid
import zipfile
from dataclasses import dataclass
from pathlib import Path

from ..config import settings
from ..errors import PayloadTooLargeError, UnsupportedMediaTypeError, ValidationError
from ..validators import clean_display_name, file_extension, sanitize_filename

logger = logging.getLogger(__name__)

_CHUNK_BYTES = 1024 * 1024

MAGIC_SIGNATURES = {
    "pdf": (b"%PDF",),
    "docx": (b"PK\x03\x04",),
}


@dataclass(frozen=True)
class StoredUpload:
    stored_name: str
    original_name: str
    absolute_path: Path
    size_bytes: int
    sha256: str
    extension: str
    mime_type: str


def uploads_root() -> Path:
    root = Path(settings.upload_folder)
    root.mkdir(parents=True, exist_ok=True)
    return root


def user_upload_dir(user_id) -> Path:
    directory = uploads_root() / str(user_id)
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def resolve_stored_path(stored_name: str) -> Path | None:
    """Resolve a stored name to a path, refusing anything outside the uploads root."""
    if not stored_name:
        return None
    root = uploads_root().resolve()
    candidate = (root / stored_name).resolve()
    try:
        if os.path.commonpath([str(root), str(candidate)]) != str(root):
            return None
    except ValueError:
        return None
    return candidate


def validate_extension(filename: str) -> str:
    extension = file_extension(filename)
    if not extension:
        raise ValidationError("The file needs an extension, for example .pdf")
    if extension not in settings.allowed_extensions:
        supported = ", ".join(f".{item}" for item in settings.allowed_extensions)
        raise UnsupportedMediaTypeError(
            f"Unsupported file type. Supported types: {supported}"
        )
    return extension


def save_upload(file_storage, user_id, *, declared_length: int | None = None) -> StoredUpload:
    """Stream an upload to disk, enforcing size limits, and hash it as it lands."""
    raw_name = file_storage.filename or ""
    extension = validate_extension(raw_name)

    max_bytes = settings.max_file_size_bytes
    if declared_length and declared_length > max_bytes:
        raise PayloadTooLargeError(
            f"Files must be smaller than {settings.max_file_size_mb} MB."
        )

    display_name = clean_display_name(raw_name.split("/")[-1].split("\\")[-1], fallback="document")
    safe_stem = sanitize_filename(Path(display_name).stem, fallback="document")[:80]
    stored_name = f"{user_id}/{uuid.uuid4().hex}_{safe_stem}.{extension}"
    destination = resolve_stored_path(stored_name)
    if destination is None:
        raise ValidationError("That filename cannot be stored.")

    # Per-user directories are created lazily here so a wiped disk, a fresh
    # deployment or a first upload all work without a separate setup step.
    try:
        destination.parent.mkdir(parents=True, exist_ok=True)
    except OSError as exc:
        raise ValidationError("The file could not be saved. Please try again.") from exc

    digest = hashlib.sha256()
    size = 0
    try:
        with open(destination, "wb") as handle:
            while True:
                block = file_storage.stream.read(_CHUNK_BYTES)
                if not block:
                    break
                size += len(block)
                if size > max_bytes:
                    raise PayloadTooLargeError(
                        f"Files must be smaller than {settings.max_file_size_mb} MB."
                    )
                digest.update(block)
                handle.write(block)
    except PayloadTooLargeError:
        destination.unlink(missing_ok=True)
        raise
    except OSError as exc:
        destination.unlink(missing_ok=True)
        raise ValidationError("The file could not be saved. Please try again.") from exc

    if size == 0:
        destination.unlink(missing_ok=True)
        raise ValidationError("That file is empty.")

    _assert_content_matches(extension, destination)

    return StoredUpload(
        stored_name=stored_name,
        original_name=display_name,
        absolute_path=destination,
        size_bytes=size,
        sha256=digest.hexdigest(),
        extension=extension,
        mime_type=mimetypes.guess_type(display_name)[0] or "application/octet-stream",
    )


def _assert_content_matches(extension: str, path: Path) -> None:
    """Reject files whose bytes disagree with their extension."""
    signatures = MAGIC_SIGNATURES.get(extension)
    if signatures:
        try:
            with open(path, "rb") as handle:
                header = handle.read(8)
        except OSError as exc:
            raise ValidationError("The file could not be read.") from exc
        if not any(header.startswith(signature) for signature in signatures):
            raise UnsupportedMediaTypeError(
                f"This file does not look like a valid .{extension} file."
            )

    if extension == "docx":
        try:
            with zipfile.ZipFile(path) as archive:
                if not any(name.startswith("word/") for name in archive.namelist()):
                    raise UnsupportedMediaTypeError("This file is not a valid Word document.")
        except zipfile.BadZipFile as exc:
            raise UnsupportedMediaTypeError("This file is not a valid Word document.") from exc


def delete_stored_file(stored_name: str) -> bool:
    path = resolve_stored_path(stored_name)
    if path is None or not path.exists():
        return False
    try:
        path.unlink()
        return True
    except OSError:
        logger.warning("Stored file could not be deleted", extra={"event": "file_delete_failed"})
        return False


def delete_user_files(user_id) -> None:
    import shutil

    directory = uploads_root() / str(user_id)
    if directory.exists():
        shutil.rmtree(directory, ignore_errors=True)
