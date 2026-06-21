"""File-type detection and marker-pixel helpers."""

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
    "webp",
    "gif",
}

# Each file type gets a unique 3-byte marker pixel written just before the EOF sentinel.
# Values are ASCII bytes of a short tag, padded to 3 bytes.
_MARKERS: dict[str, tuple[int, int, int]] = {
    ".pdf":  (80, 68, 70),   # PDF
    ".docx": (68, 79, 67),   # DOC
    ".doc":  (68, 79, 67),   # DOC
    ".xlsx": (88, 76, 83),   # XLS
    ".csv":  (67, 83, 86),   # CSV
    ".png":  (80, 78, 71),   # PNG
    ".jpg":  (74, 80, 71),   # JPG
    ".jpeg": (74, 80, 71),   # JPG
    ".bmp":  (66, 77, 80),   # BMP
    ".webp": (87, 69, 66),   # WEB
    ".gif":  (71, 73, 70),   # GIF
}


def detect_extension(file_path: str) -> str:
    ext = Path(file_path).suffix.lower().lstrip(".")
    if ext not in SUPPORTED_EXTENSIONS:
        raise ValueError(
            f"Unsupported file extension '.{ext}'. "
            f"Supported: {sorted(SUPPORTED_EXTENSIONS)}"
        )
    return ext


class FileTypeRegistry:
    """Maps file extensions to their 3-byte marker pixels and back."""

    @staticmethod
    def marker_for(ext: str) -> tuple[int, int, int]:
        """Return the (R, G, B) marker pixel for a given extension (e.g. '.pdf')."""
        key = ext.lower() if ext.startswith(".") else f".{ext.lower()}"
        marker = _MARKERS.get(key)
        if marker is None:
            raise ValueError(f"No marker defined for extension '{ext}'.")
        return marker

    @staticmethod
    def ext_from_marker(rgb: tuple[int, int, int]) -> str:
        """Reverse-lookup extension from a marker pixel. Returns '' if unknown."""
        for ext, marker in _MARKERS.items():
            if marker == rgb:
                return ext
        return ""

    @staticmethod
    def is_supported(ext: str) -> bool:
        key = ext.lower().lstrip(".")
        return key in SUPPORTED_EXTENSIONS
