"""Image decomposer using semantic metadata + per-pixel entries."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image

from .base import BaseDecomposer


class ImageDecomposer(BaseDecomposer):
    def to_entries(self) -> list[tuple[str, Any]]:
        img = Image.open(self.file_path).convert("RGB")
        arr = np.array(img, dtype=np.uint8)
        h, w = arr.shape[:2]

        entries: list[tuple[str, Any]] = [
            ("meta.original_extension", Path(self.file_path).suffix.lower().lstrip(".")),
            ("image.width", int(w)),
            ("image.height", int(h)),
        ]

        index = 0
        for row in range(h):
            for col in range(w):
                pixel = tuple(int(v) for v in arr[row, col])
                entries.append((f"pixel.{index}", pixel))
                index += 1
        return entries

    def from_entries(self, entries: list[tuple[str, Any]], output_path: str) -> None:
        lookup = dict(entries)
        width = int(lookup["image.width"])
        height = int(lookup["image.height"])

        arr = np.zeros((height, width, 3), dtype=np.uint8)
        total = width * height
        for i in range(total):
            pixel = lookup.get(f"pixel.{i}", (0, 0, 0))
            row = i // width
            col = i % width
            arr[row, col] = pixel

        Image.fromarray(arr, mode="RGB").save(output_path)
