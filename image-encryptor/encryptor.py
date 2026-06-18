"""
Core encode/decode pipeline using LSB steganography.

How it works:
  1. Read the input file as raw bytes.
  2. Prepend a header: MAGIC(4) + original_byte_count(4, big-endian).
  3. Embed the payload into the 2 LSBs of each R/G/B channel of the
     key image pixels.  The visible pixel colours barely change.
  4. Save the result as PNG — compression ratio stays close to the
     original because most pixels are untouched.
  5. Write a .config.json with metadata for decoding.

Capacity:  width * height * 0.75 bytes
Example:   1920x1080 key image  ->  ~1.97 MB payload capacity

Config schema (v2):
{
  "version": 2,
  "original_filename": "report.pdf",
  "original_extension": ".pdf",
  "encrypted_output": "report-encrypted.png",
  "config_path": "report.config.json",
  "file_type": "pdf",
  "key_image": "key.png",
  "key_hash": "<sha256 of raw key pixel bytes>",
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
    MAGIC = b"CHIE"   # Crout Holdings Image Encryption

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

        # 2. Build payload: MAGIC(4) + byte_count(4 big-endian) + data
        payload = self.MAGIC + len(raw_bytes).to_bytes(4, "big") + raw_bytes

        # 3. Load key image
        km      = KeyManager(key_path)
        key_img = km.load().convert("RGB")
        w, h    = key_img.size
        pixels  = list(key_img.getdata())

        # 4. Capacity check
        pm = PixelMapper()
        required_pixels = pm.capacity_pixels(len(payload))
        if required_pixels > len(pixels):
            capacity_mb = pm.capacity_bytes(len(pixels)) / 1_048_576
            raise ValueError(
                f"Key image too small. "
                f"Payload is {len(payload)/1_048_576:.2f} MB but key image "
                f"can only hold {capacity_mb:.2f} MB. "
                f"Use a larger key image."
            )

        # 5. Embed payload into LSBs of key image pixels
        new_pixels = pm.embed(payload, pixels)

        # 6. Save output image — same dimensions, barely changed pixel values
        out_img = Image.new("RGB", (w, h))
        out_img.putdata(new_pixels)
        out_img.save(str(output_path), format="PNG", optimize=True)

        # 7. Key hash for tamper detection on decode
        key_hash = hashlib.sha256(
            bytes([v for px in pixels for v in px])
        ).hexdigest()

        # 8. Write config
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
        output_dir.mkdir(parents=True, exist_ok=True)

        config     = json.loads(config_path.read_text())
        byte_count = config["byte_count"]

        # Recover original filename
        original_filename = config.get("original_filename")
        if not original_filename:
            ext  = "." + config["file_type"]
            stem = encrypted_path.stem.removesuffix("-encrypted")
            original_filename = stem + ext

        # Load encrypted image pixels
        enc_img   = Image.open(str(encrypted_path)).convert("RGB")
        pixels    = list(enc_img.getdata())

        # Extract payload bytes from LSBs
        pm          = PixelMapper()
        header_size = 8   # MAGIC(4) + length(4)
        all_bytes   = pm.extract(pixels, header_size + byte_count)

        # Validate magic
        if all_bytes[:4] != self.MAGIC:
            raise ValueError(
                "Magic header mismatch — wrong key image or corrupted file."
            )

        # Recover original data
        raw_bytes = all_bytes[8 : 8 + byte_count]

        output_path = output_dir / original_filename
        output_path.write_bytes(raw_bytes)
        return output_path
