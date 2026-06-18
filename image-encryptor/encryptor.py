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

        # 4. Load key image
        km      = KeyManager(key_path)
        key_img = km.load().convert("RGB")
        w, h    = key_img.size
        pixels  = list(key_img.getdata())

        # 5. Capacity check
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

        # 6. Embed into LSBs
        new_pixels = pm.embed(payload, pixels)

        # 7. Save output PNG
        out_img = Image.new("RGB", (w, h))
        out_img.putdata(new_pixels)
        out_img.save(str(output_path), format="PNG", optimize=True)

        # 8. Key hash for tamper detection
        key_hash = hashlib.sha256(
            bytes([v for px in pixels for v in px])
        ).hexdigest()

        # 9. Write config (v3)
        config = {
            "version":            3,
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
            **aes_meta,
        }
        config_path.write_text(json.dumps(config, indent=2))

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
        pm          = PixelMapper()
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
