"""Byte-stream ↔ RGB pixel conversion utilities."""

from __future__ import annotations


def bytes_to_pixels(
    data: bytes,
) -> list[tuple[int, int, int]]:
    """
    Pack a byte stream into a list of (R, G, B) tuples.

    Every 3 bytes become one pixel:
      byte[0] → R
      byte[1] → G
      byte[2] → B

    If the data length is not a multiple of 3, the last pixel
    is zero-padded.
    """
    pixels: list[tuple[int, int, int]] = []
    # Pad to multiple of 3
    padded = data + b"\x00" * ((3 - len(data) % 3) % 3)
    for i in range(0, len(padded), 3):
        pixels.append((padded[i], padded[i + 1], padded[i + 2]))
    return pixels


def pixels_to_bytes(
    pixels: list[tuple[int, int, int]],
    original_length: int,
) -> bytes:
    """
    Unpack (R, G, B) tuples back into a byte stream.

    `original_length` is stored in the payload header so we
    can strip zero-padding introduced during encoding.
    """
    raw = bytearray()
    for r, g, b in pixels:
        raw.extend([r, g, b])
    return bytes(raw[:original_length])
