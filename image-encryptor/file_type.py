"""File-type detection helpers."""

from pathlib import Path

SUPPORTED_EXTENSIONS = {
    "pdf",
    "docx",
    "doc",
    "xlsx",
    "csv",
    "png",
    "jpg",
    "jpeg",
    "bmp",
}


def detect_extension(file_path: str) -> str:
    ext = Path(file_path).suffix.lower().lstrip(".")
    if ext not in SUPPORTED_EXTENSIONS:
        raise ValueError(
            f"Unsupported file extension '.{ext}'. Supported: {sorted(SUPPORTED_EXTENSIONS)}"
        )
    return ext
