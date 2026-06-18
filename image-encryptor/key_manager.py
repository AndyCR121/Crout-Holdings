"""Key image handling and pixel indexing helpers."""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image


class KeyManager:
    def __init__(self, key_image_path: str) -> None:
        self.key_path = Path(key_image_path)
        if not self.key_path.exists():
            raise FileNotFoundError(f"Key image not found: {self.key_path}")

        img = Image.open(self.key_path).convert("RGB")
        self.width = img.width
        self.height = img.height
        self.capacity_pixels = self.width * self.height
        self._array = np.array(img, dtype=np.uint8)

    def key_array(self) -> np.ndarray:
        return self._array.copy()

    def fresh_canvas(self) -> np.ndarray:
        return self._array.copy()

    def flat_index_to_rc(self, index: int) -> tuple[int, int]:
        row = index // self.width
        col = index % self.width
        return row, col

    def rc_to_flat_index(self, row: int, col: int) -> int:
        return row * self.width + col

    def available_indices(self) -> list[int]:
        return list(range(self.capacity_pixels))

    def check_capacity(self, required_pixels: int) -> None:
        if required_pixels > self.capacity_pixels:
            raise OverflowError(
                f"Payload requires {required_pixels} semantic entries but key image only provides "
                f"{self.capacity_pixels} pixels ({self.width}×{self.height})."
            )
