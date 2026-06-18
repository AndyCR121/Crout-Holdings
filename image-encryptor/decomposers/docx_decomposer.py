"""DOCX decomposer — reads/writes raw DOCX (zip) bytes."""

from __future__ import annotations

from pathlib import Path

from .base import BaseDecomposer


class DocxDecomposer(BaseDecomposer):
    """
    Strategy: store raw DOCX bytes verbatim.

    A .docx file is a ZIP archive containing XML parts.
    We store the entire archive as-is so the file can be
    perfectly reconstructed byte-for-byte on decode.

    Alternative (for key-value inspection) would be to
    unzip and serialise the XML as UTF-8 text — but that
    adds reconstruction complexity and potential fidelity
    loss for embedded media. Raw bytes is safer.
    """

    def to_bytes(self) -> bytes:
        return Path(self.file_path).read_bytes()

    def from_bytes(self, data: bytes, output_path: str) -> None:
        Path(output_path).write_bytes(data)
        print(f"[DOCX] Recovered → {output_path}")
