"""Loads and validates the key (base) image."""

from __future__ import annotations

from pathlib import Path
from PIL import Image


class KeyManager:
    """Wraps the key image used as the encryption carrier."""

    SUPPORTED = {".png", ".jpg", ".jpeg", ".bmp", ".webp"}

    def __init__(self, key_path: Path) -> None:
        self.key_path = Path(key_path)

    def load(self) -> Image.Image:
        if not self.key_path.exists():
            raise FileNotFoundError(f"Key image not found: {self.key_path}")
        ext = self.key_path.suffix.lower()
        if ext not in self.SUPPORTED:
            raise ValueError(
                f"Unsupported key image format '{ext}'. "
                f"Supported: {sorted(self.SUPPORTED)}"
            )
        img = Image.open(str(self.key_path))
        w, h = img.size
        if w * h < 10:
            raise ValueError("Key image is too small (minimum 10 pixels).")
        return img

    def capacity_bytes(self) -> int:
        """Maximum bytes this key image can store."""
        img = self.load()
        w, h = img.size
        return w * h * 3
