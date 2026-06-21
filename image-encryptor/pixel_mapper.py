"""LSB (Least Significant Bit) steganography helpers.

The mapper supports 1 or 2 least-significant bits per RGB channel:

- 2 bits/channel: 6 bits per pixel, 0.75 bytes per pixel.
- 1 bit/channel: 3 bits per pixel, 0.375 bytes per pixel.
"""

from __future__ import annotations


BITS_PER_CHANNEL = 2


class PixelMapper:
    """Embeds / extracts a raw byte stream into/from image pixel LSBs."""

    def __init__(self, bits_per_channel: int = BITS_PER_CHANNEL) -> None:
        if bits_per_channel not in (1, 2):
            raise ValueError("bits_per_channel must be 1 or 2.")
        self.bits_per_channel = bits_per_channel
        self.mask = (1 << bits_per_channel) - 1
        self.clear = ~self.mask & 0xFF

    def embed(self, data: bytes, pixels: list[tuple[int, int, int]]) -> list[tuple[int, int, int]]:
        """Return a new pixel list with `data` embedded into the LSBs."""
        required = self.capacity_pixels(len(data), self.bits_per_channel)
        if len(pixels) < required:
            raise ValueError(f"Not enough pixels. Need {required}, have {len(pixels)}.")

        groups = _bytes_to_groups(data, self.bits_per_channel)
        result = list(pixels)
        group_idx = 0
        for px_idx in range(required):
            channels = list(result[px_idx])
            for ch in range(3):
                if group_idx < len(groups):
                    channels[ch] = (channels[ch] & self.clear) | groups[group_idx]
                    group_idx += 1
            result[px_idx] = (channels[0], channels[1], channels[2])

        return result

    def extract(self, pixels: list[tuple[int, int, int]], byte_count: int) -> bytes:
        """Extract `byte_count` bytes from the LSBs of `pixels`."""
        required = self.capacity_pixels(byte_count, self.bits_per_channel)
        groups: list[int] = []
        for px_idx in range(required):
            r, g, b = pixels[px_idx]
            for ch_val in (r, g, b):
                groups.append(ch_val & self.mask)

        return _groups_to_bytes(groups, byte_count, self.bits_per_channel)

    @staticmethod
    def capacity_pixels(byte_count: int, bits_per_channel: int = BITS_PER_CHANNEL) -> int:
        """Minimum number of pixels needed to store `byte_count` bytes."""
        total_bits = byte_count * 8
        bits_per_pixel = 3 * bits_per_channel
        return -(-total_bits // bits_per_pixel)

    @staticmethod
    def capacity_bytes(pixel_count: int, bits_per_channel: int = BITS_PER_CHANNEL) -> int:
        """How many bytes can be stored in `pixel_count` pixels."""
        return (pixel_count * 3 * bits_per_channel) // 8

    def bytes_to_pixels(self, data: bytes) -> list[tuple[int, int, int]]:
        """Legacy shim: returns dummy black pixels sized for the data."""
        count = self.capacity_pixels(len(data), self.bits_per_channel)
        return [(0, 0, 0)] * count

    def pixels_to_bytes(self, pixels: list[tuple[int, int, int]]) -> bytes:
        """Legacy shim: not meaningful without byte_count. Use extract() instead."""
        return b""


def _bytes_to_groups(data: bytes, bits_per_group: int) -> list[int]:
    """Split bytes into MSB-first groups of `bits_per_group` bits."""
    groups: list[int] = []
    mask = (1 << bits_per_group) - 1
    for byte in data:
        for shift in range(8 - bits_per_group, -1, -bits_per_group):
            groups.append((byte >> shift) & mask)
    return groups


def _groups_to_bytes(groups: list[int], byte_count: int, bits_per_group: int) -> bytes:
    """Reconstruct bytes from MSB-first fixed-width groups."""
    groups_per_byte = 8 // bits_per_group
    result = bytearray()
    for i in range(byte_count):
        base = i * groups_per_byte
        if base + groups_per_byte > len(groups):
            break
        byte = 0
        for group in groups[base : base + groups_per_byte]:
            byte = (byte << bits_per_group) | group
        result.append(byte)
    return bytes(result)
