"""Config file writer/reader for semantic pixel mappings."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


class ConfigManager:
    @staticmethod
    def write_config(
        output_path: str,
        *,
        file_type: str,
        schema_version: int,
        image_size: tuple[int, int],
        entries: list[dict[str, Any]],
    ) -> None:
        payload = {
            "file_type": file_type,
            "schema_version": schema_version,
            "image_size": {
                "width": image_size[0],
                "height": image_size[1],
            },
            "entry_count": len(entries),
            "entries": entries,
        }
        Path(output_path).write_text(
            json.dumps(payload, indent=2),
            encoding="utf-8",
        )

    @staticmethod
    def read_config(config_path: str) -> dict[str, Any]:
        return json.loads(Path(config_path).read_text(encoding="utf-8"))
