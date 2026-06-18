"""Abstract base class for all file decomposers."""

from abc import ABC, abstractmethod


class BaseDecomposer(ABC):
    """
    Contract for decomposing a file into a raw byte stream.

    All decomposers must:
      - read the file from `file_path`
      - return the content as `bytes` (the canonical byte stream
        that will be encoded pixel-by-pixel into the carrier image)

    The byte stream is format-specific:
      - Binary formats (PDF, DOCX zip container) → raw file bytes
      - Structured formats (XLSX cells, CSV rows) → serialised
        key=value text encoded as UTF-8 bytes
    """

    def __init__(self, file_path: str) -> None:
        self.file_path = file_path

    @abstractmethod
    def to_bytes(self) -> bytes:
        """Return the full byte representation of the file content."""
        ...

    @abstractmethod
    def from_bytes(self, data: bytes, output_path: str) -> None:
        """Reconstruct the original file from decoded bytes."""
        ...
