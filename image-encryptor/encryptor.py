"""Core semantic image encryptor implementation."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image

from config_manager import ConfigManager
from decomposers import (
    BaseDecomposer,
    DocxDecomposer,
    ImageDecomposer,
    PdfDecomposer,
    XlsxDecomposer,
)
from file_type import detect_extension
from key_manager import KeyManager
from pixel_mapper import decode_value_against_key, encode_value_against_key
from semantic_types import denormalize_value_from_json, infer_value_type, normalize_value_for_json

SCHEMA_VERSION = 2


class ImageEncryptor:
    def __init__(self, key_image_path: str) -> None:
        self.key = KeyManager(key_image_path)

    def _get_decomposer(self, file_path: str, ext: str) -> BaseDecomposer:
        mapping = {
            "pdf": PdfDecomposer,
            "docx": DocxDecomposer,
            "doc": DocxDecomposer,
            "xlsx": XlsxDecomposer,
            "csv": XlsxDecomposer,
            "png": ImageDecomposer,
            "jpg": ImageDecomposer,
            "jpeg": ImageDecomposer,
            "bmp": ImageDecomposer,
        }
        cls = mapping.get(ext)
        if cls is None:
            raise ValueError(f"No decomposer for extension: {ext}")
        return cls(file_path)

    def encode(self, input_file: str, output_image: str, output_config: str) -> None:
        ext = detect_extension(input_file)
        decomposer = self._get_decomposer(input_file, ext)
        entries = decomposer.to_entries()

        self.key.check_capacity(len(entries))

        canvas = self.key.fresh_canvas()
        key_array = self.key.key_array()
        available = self.key.available_indices()

        config_entries: list[dict[str, Any]] = []

        print(f"[Encryptor] Semantic entries: {len(entries):,}")

        for index, (key_name, value) in enumerate(entries):
            pixel_index = available[index]
            row, col = self.key.flat_index_to_rc(pixel_index)

            key_rgb = tuple(int(v) for v in key_array[row, col])
            value_type = infer_value_type(value)
            encrypted_rgb = encode_value_against_key(key_rgb, value, value_type)

            canvas[row, col] = encrypted_rgb
            config_entries.append(
                {
                    "key": key_name,
                    "pixel_index": pixel_index,
                    "value_type": value_type,
                }
            )

        Image.fromarray(canvas, mode="RGB").save(output_image)
        ConfigManager.write_config(
            output_config,
            file_type=ext,
            schema_version=SCHEMA_VERSION,
            image_size=(self.key.width, self.key.height),
            entries=config_entries,
        )

        print(f"[Encryptor] Encrypted image saved → {output_image}")
        print(f"[Encryptor] Config saved → {output_config}")

    def decode(self, encrypted_image: str, input_config: str, output_file: str) -> None:
        enc_arr = np.array(Image.open(encrypted_image).convert("RGB"), dtype=np.uint8)
        key_arr = self.key.key_array()
        config = ConfigManager.read_config(input_config)

        decoded_entries: list[tuple[str, Any]] = []
        for entry in config["entries"]:
            key_name = entry["key"]
            pixel_index = int(entry["pixel_index"])
            value_type = entry["value_type"]

            row, col = self.key.flat_index_to_rc(pixel_index)
            key_rgb = tuple(int(v) for v in key_arr[row, col])
            encrypted_rgb = tuple(int(v) for v in enc_arr[row, col])

            value = decode_value_against_key(key_rgb, encrypted_rgb, value_type)
            value = denormalize_value_from_json(normalize_value_for_json(value), value_type)
            decoded_entries.append((key_name, value))

        original_ext = detect_extension(output_file)
        decomposer = self._get_decomposer(output_file, original_ext)
        decomposer.from_entries(decoded_entries, output_file)

        print(f"[Decryptor] Recovered semantic entries: {len(decoded_entries):,}")
        print(f"[Decryptor] Output saved → {output_file}")
