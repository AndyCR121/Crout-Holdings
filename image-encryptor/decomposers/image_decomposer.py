"""Image decomposer — serialises pixel RGB tuples to bytes."""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

from .base import BaseDecomposer


class ImageDecomposer(BaseDecomposer):
    """
    Strategy:
      Encode the input image's pixel data as a compact binary stream:

      Header (8 bytes):
        [0:2] width  (uint16, big-endian)
        [2:4] height (uint16, big-endian)
        [4]   channels (1 = grayscale, 3 = RGB)
        [5:8] reserved (0x00)

      Body:
        Flat array of pixel channel values (uint8), row-major order.

    This preserves the image faithfully (lossless), independent of
    the carrier format, and keeps the decomposer simple.
    """

    def to_bytes(self) -> bytes:
        img = Image.open(self.file_path).convert("RGB")
        arr = np.array(img, dtype=np.uint8)
        h, w = arr.shape[:2]

        header = bytearray(8)
        header[0] = (w >> 8) & 0xFF
        header[1] = w & 0xFF
        header[2] = (h >> 8) & 0xFF
        header[3] = h & 0xFF
        header[4] = 3  # RGB channels
        # bytes 5-7 reserved

        return bytes(header) + arr.tobytes()

    def from_bytes(self, data: bytes, output_path: str) -> None:
        header = data[:8]
        w = (header[0] << 8) | header[1]
        h = (header[2] << 8) | header[3]
        channels = header[4]

        expected_body = w * h * channels
        body = data[8 : 8 + expected_body]

        arr = np.frombuffer(body, dtype=np.uint8).reshape((h, w, channels))
        img = Image.fromarray(arr, mode="RGB")
        img.save(output_path)
        print(f"[IMAGE] Recovered → {output_path}")
