"""
Core encode/decode pipeline.

All decomposers are bypassed in favour of reading/writing raw bytes directly.
This is simpler, lossless, and works for every supported format.

Config schema stored as <stem>.config.json:
{
  "version": 2,
  "original_filename": "report.pdf",
  "original_extension": ".pdf",
  "encrypted_output": "report-encrypted.png",
  "config_path": "report.config.json",
  "file_type": "pdf",
  "key_image": "key.png",
  "key_hash": "<sha256 of key pixel bytes>",
  "byte_count": 12345,
  "width": 1920,
  "height": 1080
}
"""

from __future__ import annotations

import json
import hashlib
from pathlib import Path
from PIL import Image

from key_manager import KeyManager
from pixel_mapper import PixelMapper
from file_type import FileTypeRegistry


SUPPORTED_EXTENSIONS = {
    ".pdf", ".docx", ".doc", ".xlsx", ".csv",
    ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp",
}


class Encryptor:
    MAGIC   = b"CHIE"        # Crout Holdings Image Encryption
    EOF_PIX = (255, 0, 255)  # Magenta sentinel

    # ------------------------------------------------------------------ encode

    def encode(
        self,
        input_path: Path,
        key_path: Path,
        output_path: Path,
        config_path: Path,
    ) -> None:
        input_path  = Path(input_path)
        key_path    = Path(key_path)
        output_path = Path(output_path)
        config_path = Path(config_path)

        ext = input_path.suffix.lower()
        if ext not in SUPPORTED_EXTENSIONS:
            raise ValueError(f"Unsupported file type: {ext}")

        # 1. Read raw bytes
        raw_bytes = input_path.read_bytes()

        # 2. Build payload: MAGIC(4) + length(4 big-endian) + data
        payload = self.MAGIC + len(raw_bytes).to_bytes(4, "big") + raw_bytes

        # 3. Load key image
        km      = KeyManager(key_path)
        key_img = km.load()
        w, h    = key_img.size
        max_bytes = w * h * 3

        # 4. Capacity check (payload + file-type marker pixel + EOF pixel)
        if len(payload) + 6 > max_bytes:
            raise ValueError(
                f"Key image too small. Need {len(payload)+6} bytes, "
                f"have {max_bytes}."
            )

        # 5. Convert payload bytes -> pixel list
        pm     = PixelMapper()
        pixels = pm.bytes_to_pixels(payload)

        # 6. Append file-type marker + EOF sentinel
        pixels.append(FileTypeRegistry.marker_for(ext))
        pixels.append(self.EOF_PIX)

        # 7. Write pixels into a copy of the key image
        out_img   = key_img.copy().convert("RGB")
        img_array = list(out_img.getdata())
        for i, pix in enumerate(pixels):
            img_array[i] = pix
        out_img.putdata(img_array)
        out_img.save(str(output_path), format="PNG")

        # 8. Key hash for tamper detection
        key_pixels = list(key_img.convert("RGB").getdata())
        key_hash   = hashlib.sha256(
            bytes([v for px in key_pixels for v in px])
        ).hexdigest()

        # 9. Save config
        config = {
            "version":            2,
            "original_filename":  input_path.name,
            "original_extension": ext,
            "encrypted_output":   output_path.name,
            "config_path":        config_path.name,
            "file_type":          ext.lstrip("."),
            "key_image":          key_path.name,
            "key_hash":           key_hash,
            "byte_count":         len(raw_bytes),
            "width":              w,
            "height":             h,
        }
        config_path.write_text(json.dumps(config, indent=2))

    # ------------------------------------------------------------------ decode

    def decode(
        self,
        encrypted_path: Path,
        key_path: Path,
        config_path: Path,
        output_dir: Path,
    ) -> Path:
        encrypted_path = Path(encrypted_path)
        config_path    = Path(config_path)
        output_dir     = Path(output_dir)

        config     = json.loads(config_path.read_text())
        byte_count = config["byte_count"]

        # Recover original filename
        original_filename = config.get("original_filename")
        if not original_filename:
            ext = "." + config["file_type"]
            stem = encrypted_path.stem.removesuffix("-encrypted")
            original_filename = stem + ext

        # Read encrypted image pixels
        enc_img   = Image.open(str(encrypted_path)).convert("RGB")
        img_array = list(enc_img.getdata())

        # How many pixels hold the payload?
        total_payload_bytes = 4 + 4 + byte_count  # MAGIC + length + data
        total_pixels = -(-total_payload_bytes // 3)  # ceiling division

        pm        = PixelMapper()
        all_bytes = pm.pixels_to_bytes(img_array[:total_pixels])

        # Validate magic header
        if all_bytes[:4] != self.MAGIC:
            raise ValueError(
                "Magic header mismatch — wrong key image or corrupted file."
            )

        # Extract original data
        raw_bytes = all_bytes[8 : 8 + byte_count]

        # Write recovered file
        output_path = output_dir / original_filename
        output_path.write_bytes(raw_bytes)
        return output_path
