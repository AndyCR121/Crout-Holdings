"""
Core encode/decode pipeline — LSB steganography + AES-256-GCM.

Layer 1 — AES-256-GCM  (optional but strongly recommended)
  - Passphrase → 256-bit key via PBKDF2-HMAC-SHA256 (600 000 iterations, random 16-byte salt)
  - Payload encrypted with AES-256-GCM; nonce (16 bytes) and tag (16 bytes) stored in config.
  - Without the correct passphrase the LSB data is indistinguishable from random noise.

Layer 2 — LSB steganography
  - Embed the (optionally AES-encrypted) bytes into the 2 LSBs of each
    R/G/B channel of the key image.  Visual change is imperceptible.

Capacity:  width * height * 0.75 bytes
Example:   1920x1080  →  ~1.97 MB payload

Config schema (v3):
{
  "version": 3,
  "original_filename": "report.pdf",
  "original_extension": ".pdf",
  "encrypted_output": "report-encrypted.png",
  "config_path": "report.config.json",
  "file_type": "pdf",
  "key_image": "key.png",
  "key_hash": "<sha256 of raw key pixel bytes>",
  "byte_count": 12345,
  "width": 1920,
  "height": 1080,
  "aes_encrypted": true,
  "aes_salt": "<hex>",
  "aes_nonce": "<hex>",
  "aes_tag": "<hex>"
}
"""

from __future__ import annotations

import hashlib
import json
import os
import tempfile
from pathlib import Path

from PIL import Image

from key_manager import KeyManager
from pixel_mapper import PixelMapper
from file_type import FileTypeRegistry  # noqa: F401  (kept for potential future use)

# ── AES-256-GCM via PyCryptodome ────────────────────────────────────────────
try:
    from Crypto.Cipher import AES
    from Crypto.Protocol.KDF import PBKDF2
    from Crypto.Hash import SHA256
    _AES_AVAILABLE = True
except ImportError:  # pragma: no cover
    _AES_AVAILABLE = False


SUPPORTED_EXTENSIONS = {
    ".pdf", ".docx", ".doc", ".xlsx", ".csv",
    ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp",
}

_PBKDF2_ITERATIONS = 600_000
_SALT_BYTES        = 16
_NONCE_BYTES       = 16
DEFAULT_STRICT_SIZE_DELTA_PCT = 1.0


class EncodeError(Exception):
    """Base class for structured encode/decode errors."""

    code = "encode_error"

    def __init__(self, message: str, **details) -> None:
        super().__init__(message)
        self.message = message
        self.details = details

    def to_dict(self) -> dict:
        return {"code": self.code, "message": self.message, **self.details}


class CapacityError(EncodeError):
    code = "capacity_exceeded"


class SizeDeltaError(EncodeError):
    code = "size_delta_exceeded"


class UnsupportedCarrierError(EncodeError):
    code = "unsupported_carrier"


def _output_extension_for_format(fmt: str) -> str:
    return {
        "JPEG": ".jpg",
        "PNG": ".png",
        "BMP": ".bmp",
        "TIFF": ".tiff",
    }[fmt]


def encrypted_name_for(input_path: Path, carrier_format: str) -> str:
    """Return the carrier-aware encrypted output filename for an input file."""
    return f"{Path(input_path).stem}-encrypted{_output_extension_for_format(carrier_format)}"


def _size_delta_pct(original_size: int, encoded_size: int) -> float:
    return ((encoded_size - original_size) / original_size) * 100


def _strategy_for_format(fmt: str) -> str:
    if fmt == "JPEG":
        return "jpeg-dct-strict-unavailable"
    if fmt == "PNG":
        return "png-lsb-size-budget"
    if fmt in {"BMP", "TIFF"}:
        return f"{fmt.lower()}-fixed-lsb"
    raise UnsupportedCarrierError(
        f"Unsupported carrier format: {fmt}",
        carrier_format=fmt,
    )


def _jpeg_capacity_bytes(key_img: Image.Image) -> int:
    """Return safe JPEG-domain capacity.

    Pillow does not expose quantized DCT coefficients, and exact byte recovery
    cannot be implemented by resaving JPEG pixels through a lossy codec. Keep
    this explicit so strict mode fails before creating a misleading output.
    """
    return 0


def _derive_key(passphrase: str, salt: bytes) -> bytes:
    """PBKDF2-HMAC-SHA256 → 32-byte AES key."""
    if not _AES_AVAILABLE:
        raise RuntimeError(
            "pycryptodome is required for AES encryption.\n"
            "Run: pip install pycryptodome"
        )
    return PBKDF2(
        passphrase.encode(),
        salt,
        dkLen=32,
        count=_PBKDF2_ITERATIONS,
        prf=lambda p, s: __import__('hmac').new(p, s, __import__('hashlib').sha256).digest(),
    )


def _aes_encrypt(plaintext: bytes, passphrase: str) -> tuple[bytes, bytes, bytes, bytes]:
    """Return (ciphertext, salt, nonce, tag)."""
    salt  = os.urandom(_SALT_BYTES)
    nonce = os.urandom(_NONCE_BYTES)
    key   = _derive_key(passphrase, salt)
    cipher = AES.new(key, AES.MODE_GCM, nonce=nonce)
    ciphertext, tag = cipher.encrypt_and_digest(plaintext)
    return ciphertext, salt, nonce, tag


def _aes_decrypt(ciphertext: bytes, passphrase: str,
                 salt: bytes, nonce: bytes, tag: bytes) -> bytes:
    """Return decrypted plaintext; raises ValueError on wrong passphrase."""
    key    = _derive_key(passphrase, salt)
    cipher = AES.new(key, AES.MODE_GCM, nonce=nonce)
    try:
        return cipher.decrypt_and_verify(ciphertext, tag)
    except ValueError as exc:
        raise ValueError(
            "AES-GCM authentication failed — wrong passphrase or corrupted data."
        ) from exc


class Encryptor:
    MAGIC = b"CHIE"   # Crout Holdings Image Encryption

    # ------------------------------------------------------------------ encode

    def encode(
        self,
        input_path: Path,
        key_path: Path,
        output_path: Path,
        config_path: Path,
        passphrase: str | None = None,
        strict_size_delta_pct: float | None = DEFAULT_STRICT_SIZE_DELTA_PCT,
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

        # 2. Optionally AES-256-GCM encrypt
        aes_meta: dict = {"aes_encrypted": False}
        payload_data = raw_bytes
        if passphrase:
            if not _AES_AVAILABLE:
                raise RuntimeError(
                    "pycryptodome is not installed.  Run: pip install pycryptodome"
                )
            ciphertext, salt, nonce, tag = _aes_encrypt(raw_bytes, passphrase)
            payload_data = ciphertext
            aes_meta = {
                "aes_encrypted": True,
                "aes_salt":  salt.hex(),
                "aes_nonce": nonce.hex(),
                "aes_tag":   tag.hex(),
            }

        # 3. Build LSB payload: MAGIC(4) + byte_count(4 big-endian) + data
        payload = self.MAGIC + len(payload_data).to_bytes(4, "big") + payload_data

        # 4. Load key image and detect the real carrier format from file bytes
        km      = KeyManager(key_path)
        loaded_img = km.load()
        carrier_format = (loaded_img.format or "").upper()
        key_img = loaded_img.convert("RGB")
        w, h    = key_img.size
        pixels  = list(key_img.getdata())
        carrier_size_bytes = key_path.stat().st_size
        encoding_strategy = _strategy_for_format(carrier_format)

        # 5. Capacity and size-budget check
        if carrier_format == "JPEG":
            capacity_bytes = _jpeg_capacity_bytes(key_img)
            raise UnsupportedCarrierError(
                "Strict JPEG carriers require DCT-domain embedding, but the current "
                "runtime only has Pillow pixel access. Use BMP/TIFF for guaranteed "
                "<=1% full-capacity output, or add a JPEG DCT backend.",
                carrier_format=carrier_format,
                encoding_strategy=encoding_strategy,
                capacity_bytes=capacity_bytes,
                payload_bytes=len(payload),
                carrier_size_bytes=carrier_size_bytes,
            )
        save_kwargs = self._save_kwargs(carrier_format)
        if output_path.suffix.lower() != _output_extension_for_format(carrier_format):
            output_path = output_path.with_suffix(_output_extension_for_format(carrier_format))

        bit_options = (2, 1) if carrier_format == "PNG" else (2,)
        last_size_error: SizeDeltaError | None = None
        for bits_per_channel in bit_options:
            pm = PixelMapper(bits_per_channel=bits_per_channel)
            capacity_bytes = pm.capacity_bytes(len(pixels), bits_per_channel)
            required_pixels = pm.capacity_pixels(len(payload), bits_per_channel)
            capacity_used_pct = (len(payload) / capacity_bytes) * 100 if capacity_bytes else 0.0
            if required_pixels > len(pixels):
                if bits_per_channel == bit_options[-1]:
                    raise CapacityError(
                        f"Key image too small. Payload is {len(payload)} bytes but carrier "
                        f"can only hold {capacity_bytes} bytes.",
                        carrier_format=carrier_format,
                        encoding_strategy=encoding_strategy,
                        bits_per_channel=bits_per_channel,
                        capacity_bytes=capacity_bytes,
                        payload_bytes=len(payload),
                        capacity_used_pct=round(capacity_used_pct, 4),
                    )
                continue

            new_pixels = pm.embed(payload, pixels)
            out_img = Image.new("RGB", (w, h))
            out_img.putdata(new_pixels)

            with tempfile.TemporaryDirectory() as _tmp:
                candidate = Path(_tmp) / output_path.name
                out_img.save(str(candidate), format=carrier_format, **save_kwargs)
                encoded_size_bytes = candidate.stat().st_size
                size_delta_pct = _size_delta_pct(carrier_size_bytes, encoded_size_bytes)
                if (
                    strict_size_delta_pct is not None
                    and abs(size_delta_pct) > strict_size_delta_pct
                ):
                    last_size_error = SizeDeltaError(
                        f"Encoded image size delta is {size_delta_pct:+.2f}%, "
                        f"exceeding the {strict_size_delta_pct:.2f}% limit.",
                        carrier_format=carrier_format,
                        output_format=carrier_format,
                        encoding_strategy=encoding_strategy,
                        bits_per_channel=bits_per_channel,
                        carrier_size_bytes=carrier_size_bytes,
                        encoded_size_bytes=encoded_size_bytes,
                        size_delta_pct=round(size_delta_pct, 4),
                        strict_size_delta_pct=strict_size_delta_pct,
                        capacity_bytes=capacity_bytes,
                        payload_bytes=len(payload),
                        capacity_used_pct=round(capacity_used_pct, 4),
                    )
                    continue
                output_path.write_bytes(candidate.read_bytes())
                break
        else:
            if last_size_error is not None:
                raise last_size_error
            raise CapacityError(
                f"Key image too small. Payload is {len(payload)} bytes.",
                carrier_format=carrier_format,
                encoding_strategy=encoding_strategy,
                capacity_bytes=0,
                payload_bytes=len(payload),
            )

        # 8. Key hash for tamper detection
        key_hash = hashlib.sha256(
            bytes([v for px in pixels for v in px])
        ).hexdigest()

        # 9. Write config (v4)
        config = {
            "version":            4,
            "original_filename":  input_path.name,
            "original_extension": ext,
            "encrypted_output":   output_path.name,
            "config_path":        config_path.name,
            "file_type":          ext.lstrip("."),
            "key_image":          key_path.name,
            "key_hash":           key_hash,
            "byte_count":         len(payload_data),
            "width":              w,
            "height":             h,
            "carrier_format":     carrier_format,
            "output_format":      carrier_format,
            "carrier_size_bytes":  carrier_size_bytes,
            "encoded_size_bytes":  encoded_size_bytes,
            "size_delta_pct":      round(size_delta_pct, 4),
            "capacity_bytes":      capacity_bytes,
            "capacity_used_pct":   round(capacity_used_pct, 4),
            "encoding_strategy":   encoding_strategy,
            "bits_per_channel":    bits_per_channel,
            **aes_meta,
        }
        config_path.write_text(json.dumps(config, indent=2))

    @staticmethod
    def _save_kwargs(carrier_format: str) -> dict:
        if carrier_format == "PNG":
            return {"optimize": True}
        if carrier_format == "BMP":
            return {}
        if carrier_format == "TIFF":
            return {"compression": "raw"}
        if carrier_format == "JPEG":
            return {"quality": 95, "subsampling": 0, "optimize": True}
        return {}

    # ------------------------------------------------------------------ decode

    def decode(
        self,
        encrypted_path: Path,
        key_path: Path,
        config_path: Path,
        output_dir: Path,
        passphrase: str | None = None,
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
        enc_img = Image.open(str(encrypted_path)).convert("RGB")
        pixels  = list(enc_img.getdata())

        # Extract LSB payload
        pm          = PixelMapper(bits_per_channel=config.get("bits_per_channel", 2))
        header_size = 8   # MAGIC(4) + length(4)
        all_bytes   = pm.extract(pixels, header_size + byte_count)

        # Validate magic
        if all_bytes[:4] != self.MAGIC:
            raise ValueError(
                "Magic header mismatch — wrong key image or corrupted file."
            )

        payload_data = all_bytes[8 : 8 + byte_count]

        # AES-256-GCM decrypt if applicable
        if config.get("aes_encrypted"):
            if not passphrase:
                raise ValueError(
                    "This file was encrypted with a passphrase. "
                    "Provide --passphrase to decrypt."
                )
            if not _AES_AVAILABLE:
                raise RuntimeError(
                    "pycryptodome is required.  Run: pip install pycryptodome"
                )
            salt  = bytes.fromhex(config["aes_salt"])
            nonce = bytes.fromhex(config["aes_nonce"])
            tag   = bytes.fromhex(config["aes_tag"])
            payload_data = _aes_decrypt(payload_data, passphrase, salt, nonce, tag)

        output_path = output_dir / original_filename
        output_path.write_bytes(payload_data)
        return output_path
