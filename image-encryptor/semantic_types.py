"""Semantic value typing helpers."""

from __future__ import annotations

from typing import Any


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
