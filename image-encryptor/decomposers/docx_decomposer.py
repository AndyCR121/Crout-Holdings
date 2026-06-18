"""DOCX/DOC decomposer using base64 semantic chunks."""

from __future__ import annotations

import base64
from pathlib import Path
from typing import Any

from .base import BaseDecomposer


class DocxDecomposer(BaseDecomposer):
    CHUNK_SIZE = 3

    def to_entries(self) -> list[tuple[str, Any]]:
        ext = Path(self.file_path).suffix.lower().lstrip(".")
        raw = Path(self.file_path).read_bytes()
        b64 = base64.b64encode(raw).decode("ascii")
        entries: list[tuple[str, Any]] = [
            ("meta.original_extension", ext),
            ("binary.chunk_count", (len(b64) + self.CHUNK_SIZE - 1) // self.CHUNK_SIZE),
        ]
        for i in range(0, len(b64), self.CHUNK_SIZE):
            chunk_index = i // self.CHUNK_SIZE
            entries.append((f"binary.chunk.{chunk_index}", b64[i:i + self.CHUNK_SIZE]))
        return entries

    def from_entries(self, entries: list[tuple[str, Any]], output_path: str) -> None:
        lookup = dict(entries)
        chunk_count = int(lookup.get("binary.chunk_count", 0))
        b64 = "".join(str(lookup.get(f"binary.chunk.{i}", "")) for i in range(chunk_count))
        Path(output_path).write_bytes(base64.b64decode(b64.encode("ascii")))
