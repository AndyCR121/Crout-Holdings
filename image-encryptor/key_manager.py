"""Loads and validates the key (base) image."""

from __future__ import annotations

from pathlib import Path
from PIL import Image


class KeyManager:
    """Wraps the key image used as the encryption carrier."""

    SUPPORTED_FORMATS = {"PNG", "JPEG", "BMP", "TIFF"}

    def __init__(self, key_path: Path) -> None:
        self.key_path = Path(key_path)

    def load(self) -> Image.Image:
        if not self.key_path.exists():
            raise FileNotFoundError(f"Key image not found: {self.key_path}")
        img = Image.open(str(self.key_path))
        detected = (img.format or "").upper()
        if detected not in self.SUPPORTED_FORMATS:
            raise ValueError(
                f"Unsupported key image format '{detected or 'unknown'}'. "
                f"Supported: {sorted(self.SUPPORTED_FORMATS)}"
            )
        w, h = img.size
        if w * h < 10:
            raise ValueError("Key image is too small (minimum 10 pixels).")
        return img

    def format(self) -> str:
        """Return the image format detected from file bytes."""
        with self.load() as img:
            return (img.format or "").upper()

    def capacity_bytes(self) -> int:
        """Maximum bytes this key image can store."""
        img = self.load()
        w, h = img.size
        return (w * h * 3 * 2) // 8
