"""Secret key image loader and pixel index map builder."""

from __future__ import annotations

from pathlib import Path
from typing import Iterator

import numpy as np
from PIL import Image


class KeyManager:
    """
    Manages the base (secret key) image.

    The key image defines:
      - Total pixel capacity (width × height)
      - Pixel write/read order (row-major by default)

    The *content* of the key image is preserved — we write
    payload into a *copy*, leaving the original key intact.
    """

    def __init__(self, key_image_path: str) -> None:
        self.key_path = Path(key_image_path)
        if not self.key_path.exists():
            raise FileNotFoundError(f"Key image not found: {self.key_path}")

        img = Image.open(self.key_path).convert("RGB")
        self._key_array: np.ndarray = np.array(img, dtype=np.uint8)
        self.width: int = img.width
        self.height: int = img.height
        self.capacity_bytes: int = self.width * self.height * 3  # 3 channels
        self.capacity_pixels: int = self.width * self.height

    # ------------------------------------------------------------------
    # Pixel iteration helpers
    # ------------------------------------------------------------------

    def pixel_indices(self) -> Iterator[tuple[int, int]]:
        """Yield (row, col) in row-major order."""
        for r in range(self.height):
            for c in range(self.width):
                yield r, c

    def fresh_canvas(self) -> np.ndarray:
        """Return a writable copy of the key image array."""
        return self._key_array.copy()

    def check_capacity(self, required_pixels: int) -> None:
        """Raise if the key image cannot hold the payload."""
        if required_pixels > self.capacity_pixels:
            raise OverflowError(
                f"Payload requires {required_pixels} pixels but key image "
                f"only provides {self.capacity_pixels} pixels "
                f"({self.width}×{self.height}).\n"
                "Use a larger key image."
            )
