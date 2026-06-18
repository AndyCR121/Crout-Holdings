"""File-type detection and reference pixel marker definitions."""

from pathlib import Path

# File-type marker RGB tuples written just before the EOF sentinel.
# Values are ASCII codes of the file-type abbreviation.
FILE_TYPE_MARKERS: dict[str, tuple[int, int, int]] = {
    "pdf":  (80, 68, 70),   # 'P', 'D', 'F'
    "docx": (68, 79, 67),   # 'D', 'O', 'C'
    "doc":  (68, 79, 67),   # same as docx
    "xlsx": (88, 76, 83),   # 'X', 'L', 'S'
    "csv":  (67, 83, 86),   # 'C', 'S', 'V'
    "png":  (80, 78, 71),   # 'P', 'N', 'G'
    "jpg":  (74, 80, 71),   # 'J', 'P', 'G'
    "jpeg": (74, 80, 71),   # same as jpg
    "bmp":  (66, 77, 80),   # 'B', 'M', 'P'
}

# Reversed lookup: marker tuple → extension string
_REVERSE_MARKERS: dict[tuple[int, int, int], str] = {
    v: k for k, v in FILE_TYPE_MARKERS.items()
}

EOF_SENTINEL: tuple[int, int, int] = (255, 0, 255)  # Magenta


def detect_extension(file_path: str) -> str:
    """Return the lowercase extension of a file (without the dot)."""
    ext = Path(file_path).suffix.lstrip(".").lower()
    if ext not in FILE_TYPE_MARKERS:
        raise ValueError(
            f"Unsupported file type: '.{ext}'.\n"
            f"Supported types: {list(FILE_TYPE_MARKERS.keys())}"
        )
    return ext


def get_marker(ext: str) -> tuple[int, int, int]:
    """Return the marker RGB tuple for the given extension."""
    return FILE_TYPE_MARKERS[ext.lower()]


def resolve_extension_from_marker(
    marker: tuple[int, int, int]
) -> str:
    """Reverse-lookup extension from a marker RGB tuple."""
    ext = _REVERSE_MARKERS.get(marker)
    if ext is None:
        raise ValueError(f"Unknown file-type marker pixel: {marker}")
    return ext
