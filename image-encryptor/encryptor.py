"""
Core encode/decode pipeline.
Config schema (stored as <stem>.config.json):
{
  "version": 1,
  "original_filename": "report.pdf",
  "original_extension": ".pdf",
  "encrypted_output": "report-encrypted.png",
  "config_path": "report.config.json",
  "file_type": "pdf",
  "key_image": "key.png",
  "key_hash": "<sha256 of key pixel bytes>",
  "byte_count": 12345,
  "pixel_count": 4115,
  "width": <int>,
  "height": <int>
}
"""

import json
import hashlib
from pathlib import Path
from PIL import Image
from key_manager import KeyManager
from pixel_mapper import PixelMapper
from file_type import FileTypeRegistry
from decomposers.pdf_decomposer import PDFDecomposer
from decomposers.docx_decomposer import DOCXDecomposer
from decomposers.xlsx_decomposer import XLSXDecomposer
from decomposers.image_decomposer import ImageDecomposer


DECOMPOSER_MAP = {
    ".pdf":  PDFDecomposer,
    ".docx": DOCXDecomposer,
    ".doc":  DOCXDecomposer,
    ".xlsx": XLSXDecomposer,
    ".csv":  XLSXDecomposer,
    ".png":  ImageDecomposer,
    ".jpg":  ImageDecomposer,
    ".jpeg": ImageDecomposer,
    ".gif":  ImageDecomposer,
    ".bmp":  ImageDecomposer,
    ".webp": ImageDecomposer,
}


class Encryptor:
    MAGIC   = b"CHIE"          # Crout Holdings Image Encryption
    EOF_PIX = (255, 0, 255)    # Magenta sentinel

    def encode(
        self,
        input_path: Path,
        key_path: Path,
        output_path: Path,
        config_path: Path,
    ) -> None:
        ext = input_path.suffix.lower()
        decomposer_cls = DECOMPOSER_MAP.get(ext)
        if not decomposer_cls:
            raise ValueError(f"Unsupported file type: {ext}")

        # 1. Decompose
        raw_bytes = decomposer_cls().to_bytes(input_path)

        # 2. Build payload: MAGIC(4) + length(4, big-endian) + data
        length_bytes = len(raw_bytes).to_bytes(4, "big")
        payload      = self.MAGIC + length_bytes + raw_bytes

        # 3. Load key image
        km        = KeyManager(key_path)
        key_img   = km.load()
        w, h      = key_img.size
        max_bytes = w * h * 3

        # 4. File-type marker pixel + EOF sentinel (6 bytes = 2 pixels)
        ft_marker = FileTypeRegistry.marker_for(ext)        # 3 bytes
        overhead  = len(ft_marker) + 3                      # marker px + EOF px
        if len(payload) + overhead > max_bytes:
            raise ValueError(
                f"Key image too small. Need {len(payload)+overhead} bytes, "
                f"have {max_bytes}."
            )

        # 5. Map payload → pixels
        pm     = PixelMapper()
        pixels = pm.bytes_to_pixels(payload)
        pixels.append(tuple(ft_marker))  # file-type marker pixel
        pixels.append(self.EOF_PIX)      # sentinel

        # 6. Write into a copy of the key image
        out_img   = key_img.copy().convert("RGB")
        img_array = list(out_img.getdata())
        for i, pix in enumerate(pixels):
            img_array[i] = pix
        out_img.putdata(img_array)
        out_img.save(str(output_path), format="PNG")

        # 7. Compute key hash for verification
        key_hash = hashlib.sha256(
            bytes([v for px in list(key_img.convert("RGB").getdata()) for v in px])
        ).hexdigest()

        # 8. Save config
        config = {
            "version":            1,
            "original_filename":  input_path.name,
            "original_extension": ext,
            "encrypted_output":   output_path.name,
            "config_path":        config_path.name,
            "file_type":          ext.lstrip("."),
            "key_image":          key_path.name,
            "key_hash":           key_hash,
            "byte_count":         len(raw_bytes),
            "pixel_count":        len(pixels),
            "width":              w,
            "height":             h,
        }
        config_path.write_text(json.dumps(config, indent=2))

    def decode(
        self,
        encrypted_path: Path,
        key_path: Path,
        config_path: Path,
        output_dir: Path,
    ) -> Path:
        config = json.loads(config_path.read_text())

        # Recover original filename from config
        original_filename = config.get("original_filename")
        if not original_filename:
            # Fallback for configs without original_filename
            ext = "." + config["file_type"]
            stem = encrypted_path.stem.removesuffix("-encrypted")
            original_filename = stem + ext

        byte_count = config["byte_count"]

        # Load encrypted image
        enc_img   = Image.open(str(encrypted_path)).convert("RGB")
        img_array = list(enc_img.getdata())

        # Read pixels → bytes (payload = MAGIC + length + data)
        pm             = PixelMapper()
        total_payload  = 4 + 4 + byte_count   # MAGIC + len + data
        total_pixels   = (total_payload + 2) // 3 + (1 if total_payload % 3 else 0)
        raw_pixels     = img_array[:total_pixels]
        all_bytes      = pm.pixels_to_bytes(raw_pixels)

        # Strip MAGIC + length header
        magic   = all_bytes[:4]
        if magic != self.MAGIC:
            raise ValueError("Invalid encrypted image or wrong key.")
        payload_bytes = all_bytes[8 : 8 + byte_count]

        # Reconstruct file
        ext = "." + config["file_type"]
        decomposer_cls = DECOMPOSER_MAP.get(ext)
        if not decomposer_cls:
            raise ValueError(f"Unsupported file type in config: {ext}")

        output_path = output_dir / original_filename
        decomposer_cls().from_bytes(payload_bytes, output_path)
        return output_path
