"""PDF decomposer — reads/writes raw PDF bytes."""

from __future__ import annotations

from pathlib import Path

from .base import BaseDecomposer


class PdfDecomposer(BaseDecomposer):
    """
    Strategy: store the raw PDF bytes verbatim.

    PDFs are already internally compressed (Deflate/FlateDecode).
    Re-compressing adds complexity without meaningful size benefit,
    so we treat the file as an opaque binary blob.
    """

    def to_bytes(self) -> bytes:
        return Path(self.file_path).read_bytes()

    def from_bytes(self, data: bytes, output_path: str) -> None:
        Path(output_path).write_bytes(data)
        print(f"[PDF] Recovered → {output_path}")
