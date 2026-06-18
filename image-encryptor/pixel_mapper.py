"""Delta value <-> RGB encoding helpers.

Raw bytes are packed 3 bytes per pixel (R, G, B).
The PixelMapper class provides the bytes_to_pixels / pixels_to_bytes
interface expected by encryptor.py.
"""

from __future__ import annotations
from typing import Any


CHUNK_SIZE = 3  # bytes per pixel


def _to_three_bytes(value: Any, value_type: str) -> tuple[int, int, int]:
    if value_type == "bool":
        return (1 if value else 0, 0, 0)

    if value_type == "int":
        packed = int(value) % 16777216
        return ((packed >> 16) & 0xFF, (packed >> 8) & 0xFF, packed & 0xFF)

    if value_type == "float":
        scaled = int(round(float(value) * 1000)) % 16777216
        return ((scaled >> 16) & 0xFF, (scaled >> 8) & 0xFF, scaled & 0xFF)

    if value_type == "rgb":
        r, g, b = value
        return (int(r) & 0xFF, int(g) & 0xFF, int(b) & 0xFF)

    # str — caller guarantees len(value) <= CHUNK_SIZE
    encoded = str(value).encode("utf-8")[:CHUNK_SIZE]
    encoded = encoded + b"\x00" * (CHUNK_SIZE - len(encoded))
    return (encoded[0], encoded[1], encoded[2])


def _from_three_bytes(rgb: tuple[int, int, int], value_type: str) -> Any:
    if value_type == "bool":
        return bool(rgb[0])

    if value_type == "int":
        return (rgb[0] << 16) | (rgb[1] << 8) | rgb[2]

    if value_type == "float":
        raw = (rgb[0] << 16) | (rgb[1] << 8) | rgb[2]
        return raw / 1000.0

    if value_type == "rgb":
        return rgb

    # str
    raw = bytes(rgb).rstrip(b"\x00")
    return raw.decode("utf-8", errors="ignore")


def encode_value_against_key(
    key_rgb: tuple[int, int, int],
    value: Any,
    value_type: str,
) -> tuple[int, int, int]:
    raw = _to_three_bytes(value, value_type)
    return tuple((key_rgb[i] + raw[i]) % 256 for i in range(3))


def decode_value_against_key(
    key_rgb: tuple[int, int, int],
    encrypted_rgb: tuple[int, int, int],
    value_type: str,
) -> Any:
    raw = tuple((encrypted_rgb[i] - key_rgb[i]) % 256 for i in range(3))
    return _from_three_bytes(raw, value_type)


class PixelMapper:
    """Converts raw bytes <-> list of (R, G, B) pixel tuples.

    Packing: every 3 consecutive bytes become one pixel.
    If the byte count is not divisible by 3 the last pixel is zero-padded.
    """

    def bytes_to_pixels(self, data: bytes) -> list[tuple[int, int, int]]:
        pixels = []
        for i in range(0, len(data), 3):
            chunk = data[i : i + 3]
            # zero-pad if last chunk is short
            r = chunk[0] if len(chunk) > 0 else 0
            g = chunk[1] if len(chunk) > 1 else 0
            b = chunk[2] if len(chunk) > 2 else 0
            pixels.append((r, g, b))
        return pixels

    def pixels_to_bytes(self, pixels: list[tuple[int, int, int]]) -> bytes:
        out = bytearray()
        for r, g, b in pixels:
            out.extend([r, g, b])
        return bytes(out)
