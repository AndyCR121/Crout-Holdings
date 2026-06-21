"""Semantic value typing and string chunking helpers."""

from __future__ import annotations

from typing import Any

CHUNK_SIZE = 3  # UTF-8 bytes (== ASCII chars) stored per pixel for strings


def infer_value_type(value: Any) -> str:
    if isinstance(value, bool):
        return "bool"
    if isinstance(value, int):
        return "int"
    if isinstance(value, float):
        return "float"
    if isinstance(value, tuple) and len(value) == 3:
        return "rgb"
    return "str"


def chunk_str(key: str, value: str) -> list[tuple[str, Any]]:
    """Split a long string value into sequential chunk entries.

    Returns a list of (entry_key, entry_value) pairs:
      ("<key>.__chunk_count", n)
      ("<key>.__chunk.0", "abc")
      ("<key>.__chunk.1", "def")
      ...

    Each chunk is at most CHUNK_SIZE characters.
    """
    text = str(value)
    chunks = [text[i:i + CHUNK_SIZE] for i in range(0, len(text), CHUNK_SIZE)]
    entries: list[tuple[str, Any]] = [(f"{key}.__chunk_count", len(chunks))]
    for idx, chunk in enumerate(chunks):
        entries.append((f"{key}.__chunk.{idx}", chunk))
    return entries


def is_chunk_key(key: str) -> bool:
    return ".__chunk" in key


def rejoin_chunks(key: str, lookup: dict[str, Any]) -> str:
    """Reassemble a chunked string from a flat lookup dict."""
    count = int(lookup.get(f"{key}.__chunk_count", 0))
    return "".join(str(lookup.get(f"{key}.__chunk.{i}", "")) for i in range(count))


def normalize_value_for_json(value: Any) -> Any:
    if isinstance(value, tuple):
        return list(value)
    return value


def denormalize_value_from_json(value: Any, value_type: str) -> Any:
    if value_type == "bool":
        return bool(value)
    if value_type == "int":
        return int(value)
    if value_type == "float":
        return float(value)
    if value_type == "rgb":
        return tuple(value)
    return str(value)
