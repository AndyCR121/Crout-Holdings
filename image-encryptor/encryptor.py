"""Core ImageEncryptor — encode and decode pipeline."""

from __future__ import annotations

import struct
from pathlib import Path
from typing import Iterator

import numpy as np
from PIL import Image

from decomposers import (
    PdfDecomposer,
    DocxDecomposer,
    XlsxDecomposer,
    ImageDecomposer,
    BaseDecomposer,
)
from file_type import (
    detect_extension,
    get_marker,
    resolve_extension_from_marker,
    EOF_SENTINEL,
)
from key_manager import KeyManager
from pixel_mapper import bytes_to_pixels, pixels_to_bytes

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Header written at the very start of the pixel stream (before payload):
#   4-byte magic  : 0x43 0x48 0x49 0x45  → 'C','H','I','E' (Crout Holdings IE)
#   4-byte length : uint32 big-endian, original payload byte length
_MAGIC = b"CHIE"
_HEADER_PIXELS = 3  # ceil(8 bytes / 3 channels)

# Number of pixels used for the file-type marker (1 marker pixel)
_MARKER_PIXELS = 1

# Total reserved tail pixels: marker + EOF sentinel
_TAIL_PIXELS = _MARKER_PIXELS + 1  # +1 for EOF sentinel


# ---------------------------------------------------------------------------
# Decomposer registry
# ---------------------------------------------------------------------------

def _get_decomposer(file_path: str, ext: str) -> BaseDecomposer:
    mapping = {
        "pdf":  PdfDecomposer,
        "docx": DocxDecomposer,
        "doc":  DocxDecomposer,
        "xlsx": XlsxDecomposer,
        "csv":  XlsxDecomposer,
        "png":  ImageDecomposer,
        "jpg":  ImageDecomposer,
        "jpeg": ImageDecomposer,
        "bmp":  ImageDecomposer,
    }
    cls = mapping.get(ext)
    if cls is None:
        raise ValueError(f"No decomposer for extension: {ext}")
    return cls(file_path)


# ---------------------------------------------------------------------------
# Main class
# ---------------------------------------------------------------------------

class ImageEncryptor:
    """
    Steganographic file-to-image encoder.

    Parameters
    ----------
    key_image_path : str
        Path to the base/secret key image.  This image defines the
        pixel capacity and write order.  It must be the same image
        for both encode and decode operations.
    """

    def __init__(self, key_image_path: str) -> None:
        self.key = KeyManager(key_image_path)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def encode(self, input_file: str, output_image: str) -> None:
        """
        Encrypt `input_file` into `output_image` using the key image.

        Flow
        ----
        1. Detect file type → choose decomposer
        2. Decompose file → raw bytes
        3. Build header (magic + original byte length)
        4. Convert (header + payload) to pixel list
        5. Append file-type marker pixel
        6. Append EOF sentinel pixel
        7. Verify capacity of key image
        8. Write pixels into a copy of the key image
        9. Save output
        """
        ext = detect_extension(input_file)
        decomposer = _get_decomposer(input_file, ext)

        print(f"[Encryptor] Decomposing '{input_file}' ({ext.upper()})…")
        payload_bytes = decomposer.to_bytes()
        print(f"[Encryptor] Payload size: {len(payload_bytes):,} bytes")

        # 8-byte header: 4 magic + 4 length
        header = _MAGIC + struct.pack(">I", len(payload_bytes))
        stream = header + payload_bytes

        data_pixels = bytes_to_pixels(stream)
        marker_pixel = get_marker(ext)
        all_pixels = data_pixels + [marker_pixel, EOF_SENTINEL]

        self.key.check_capacity(len(all_pixels))
        print(
            f"[Encryptor] Pixels required: {len(all_pixels):,} / "
            f"{self.key.capacity_pixels:,} available"
        )

        canvas = self.key.fresh_canvas()
        pixel_iter: Iterator[tuple[int, int]] = self.key.pixel_indices()

        for pixel_value in all_pixels:
            row, col = next(pixel_iter)
            canvas[row, col] = pixel_value

        Image.fromarray(canvas, mode="RGB").save(output_image)
        print(f"[Encryptor] Encrypted image saved → {output_image}")

    def decode(self, encrypted_image: str, output_file: str) -> None:
        """
        Decrypt `encrypted_image` and write the recovered file to
        `output_file`.

        Flow
        ----
        1. Load encrypted image pixel-by-pixel (same order as key)
        2. Read pixels until EOF sentinel is found
        3. The pixel just before EOF sentinel is the file-type marker
        4. Remaining pixels (minus header) = payload
        5. Parse header to get original byte length
        6. Verify magic bytes
        7. Reconstruct file using appropriate decomposer
        """
        enc_arr = np.array(Image.open(encrypted_image).convert("RGB"), dtype=np.uint8)

        # Collect pixels in key order until EOF
        collected: list[tuple[int, int, int]] = []
        for row, col in self.key.pixel_indices():
            pixel = tuple(int(v) for v in enc_arr[row, col])
            if pixel == EOF_SENTINEL:
                break
            collected.append(pixel)  # type: ignore[arg-type]
        else:
            raise ValueError("EOF sentinel not found — wrong key image or corrupted file.")

        if len(collected) < _HEADER_PIXELS + _MARKER_PIXELS:
            raise ValueError("Encrypted image contains too few pixels to be valid.")

        # Last pixel before EOF is the file-type marker
        marker_pixel = collected[-1]
        ext = resolve_extension_from_marker(marker_pixel)
        print(f"[Decryptor] Detected file type: {ext.upper()}")

        # Remaining pixels = header + data
        data_pixels = collected[:-1]  # strip marker

        raw_bytes = pixels_to_bytes(data_pixels, len(data_pixels) * 3)

        # Validate header
        if raw_bytes[:4] != _MAGIC:
            raise ValueError(
                "Magic bytes mismatch — wrong key image, or file was not "
                "encrypted with this tool."
            )

        original_length: int = struct.unpack(">I", raw_bytes[4:8])[0]
        payload = raw_bytes[8 : 8 + original_length]

        print(f"[Decryptor] Recovering {original_length:,} bytes…")

        decomposer = _get_decomposer(output_file, ext)
        decomposer.from_bytes(payload, output_file)

        print(f"[Decryptor] Done. File recovered → {output_file}")
