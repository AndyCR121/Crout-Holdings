"""LSB (Least Significant Bit) steganography helpers.

Encoding strategy:
  - Use the 2 least significant bits of each R, G, B channel per pixel.
  - This gives 6 bits per pixel = 0.75 bytes per pixel.
  - The visual change is imperceptible (<4 levels per channel).
  - PNG compression characteristics are preserved so output size
    stays close to the original key image size.

Capacity:  width * height * 3 channels * 2 bits  =  width * height * 0.75 bytes
"""

from __future__ import annotations


# Bits used per channel (1 or 2 — 2 gives 0.75 bytes/px, 1 gives 0.375 bytes/px)
BITS_PER_CHANNEL = 2
MASK   = (1 << BITS_PER_CHANNEL) - 1   # 0b11  for 2 bits
CLEAR  = ~MASK & 0xFF                   # 0b11111100  — zeroes the LSBs


class PixelMapper:
    """Embeds / extracts a raw byte stream into/from image pixel LSBs."""

    # -------------------------------------------------------------- encode

    def embed(self, data: bytes, pixels: list[tuple[int, int, int]]) -> list[tuple[int, int, int]]:
        """Return a new pixel list with `data` embedded into the LSBs.

        `pixels` must be at least capacity_pixels(len(data)) long.
        Pixels beyond the data region are returned unchanged.
        """
        required = self.capacity_pixels(len(data))
        if len(pixels) < required:
            raise ValueError(
                f"Not enough pixels. Need {required}, have {len(pixels)}.")

        # Flatten data into a stream of 2-bit groups
        bits = _bytes_to_bit_pairs(data)   # list of ints, each 0-3

        result = list(pixels)              # copy so we don't mutate the original
        bit_idx = 0
        for px_idx in range(required):
            r, g, b = result[px_idx]
            channels = [r, g, b]
            for ch in range(3):
                if bit_idx < len(bits):
                    channels[ch] = (channels[ch] & CLEAR) | bits[bit_idx]
                    bit_idx += 1
            result[px_idx] = (channels[0], channels[1], channels[2])

        return result

    # -------------------------------------------------------------- decode

    def extract(self, pixels: list[tuple[int, int, int]], byte_count: int) -> bytes:
        """Extract `byte_count` bytes from the LSBs of `pixels`."""
        required = self.capacity_pixels(byte_count)
        bits: list[int] = []
        for px_idx in range(required):
            r, g, b = pixels[px_idx]
            for ch_val in (r, g, b):
                bits.append(ch_val & MASK)

        return _bit_pairs_to_bytes(bits, byte_count)

    # -------------------------------------------------------------- capacity

    @staticmethod
    def capacity_pixels(byte_count: int) -> int:
        """Minimum number of pixels needed to store `byte_count` bytes."""
        # Each pixel stores 3 channels * BITS_PER_CHANNEL bits = 6 bits = 0.75 bytes
        total_bits    = byte_count * 8
        bits_per_pixel = 3 * BITS_PER_CHANNEL
        return -(-total_bits // bits_per_pixel)   # ceiling division

    @staticmethod
    def capacity_bytes(pixel_count: int) -> int:
        """How many bytes can be stored in `pixel_count` pixels."""
        return (pixel_count * 3 * BITS_PER_CHANNEL) // 8

    # -------------------------------------------------------------- legacy shims
    # Kept so any code still calling bytes_to_pixels / pixels_to_bytes doesn't break.

    def bytes_to_pixels(self, data: bytes) -> list[tuple[int, int, int]]:
        """Legacy shim: returns dummy black pixels sized for the data.
        Use embed() for real LSB encoding."""
        count = self.capacity_pixels(len(data))
        return [(0, 0, 0)] * count

    def pixels_to_bytes(self, pixels: list[tuple[int, int, int]]) -> bytes:
        """Legacy shim: not meaningful without byte_count. Use extract() instead."""
        return b""


# ------------------------------------------------------------------ helpers

def _bytes_to_bit_pairs(data: bytes) -> list[int]:
    """Split each byte into 4 groups of 2 bits, MSB first."""
    pairs: list[int] = []
    for byte in data:
        pairs.append((byte >> 6) & 0b11)
        pairs.append((byte >> 4) & 0b11)
        pairs.append((byte >> 2) & 0b11)
        pairs.append( byte       & 0b11)
    return pairs


def _bit_pairs_to_bytes(pairs: list[int], byte_count: int) -> bytes:
    """Reconstruct bytes from a list of 2-bit groups, MSB first."""
    result = bytearray()
    for i in range(byte_count):
        base = i * 4
        if base + 3 >= len(pairs):
            break
        byte = (
            (pairs[base]     << 6) |
            (pairs[base + 1] << 4) |
            (pairs[base + 2] << 2) |
             pairs[base + 3]
        )
        result.append(byte)
    return bytes(result)
