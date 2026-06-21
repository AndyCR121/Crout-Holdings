"""Abstract base class for semantic decomposers."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class BaseDecomposer(ABC):
    def __init__(self, file_path: str) -> None:
        self.file_path = file_path

    @abstractmethod
    def to_entries(self) -> list[tuple[str, Any]]:
        ...

    @abstractmethod
    def from_entries(self, entries: list[tuple[str, Any]], output_path: str) -> None:
        ...
