#!/usr/bin/env python3
"""
Crout Holdings Image Encryptor — CLI entry point.
Naming convention:
  input: report.pdf
  key:   key.png
  out:   report-encrypted.png   (auto-derived)
  cfg:   report.config.json     (auto-derived)
"""

import argparse
import sys
from pathlib import Path
from encryptor import Encryptor


def derive_names(input_path: Path, output_dir: Path | None = None) -> tuple[Path, Path]:
    """Given an input file path, return (encrypted_output_path, config_path)."""
    stem = input_path.stem                  # e.g. 'report'
    base_dir = output_dir or input_path.parent
    encrypted = base_dir / f"{stem}-encrypted.png"
    config    = base_dir / f"{stem}.config.json"
    return encrypted, config


def cmd_encode(args):
    input_path  = Path(args.input)
    key_path    = Path(args.key)
    output_dir  = Path(args.output_dir) if args.output_dir else None

    if not input_path.exists():
        sys.exit(f"[error] Input file not found: {input_path}")
    if not key_path.exists():
        sys.exit(f"[error] Key image not found: {key_path}")

    encrypted_path, config_path = derive_names(input_path, output_dir)

    enc = Encryptor()
    enc.encode(
        input_path=input_path,
        key_path=key_path,
        output_path=encrypted_path,
        config_path=config_path,
    )
    print(f"[ok] Encrypted → {encrypted_path}")
    print(f"[ok] Config    → {config_path}")


def cmd_decode(args):
    encrypted_path = Path(args.input)
    key_path       = Path(args.key)
    config_path    = Path(args.config)

    if not encrypted_path.exists():
        sys.exit(f"[error] Encrypted image not found: {encrypted_path}")
    if not key_path.exists():
        sys.exit(f"[error] Key image not found: {key_path}")
    if not config_path.exists():
        sys.exit(f"[error] Config file not found: {config_path}")

    enc = Encryptor()
    output_path = enc.decode(
        encrypted_path=encrypted_path,
        key_path=key_path,
        config_path=config_path,
        output_dir=Path(args.output_dir) if args.output_dir else encrypted_path.parent,
    )
    print(f"[ok] Recovered → {output_path}")


def main():
    parser = argparse.ArgumentParser(
        prog="image-encryptor",
        description="Crout Holdings Image Encryption Algorithm",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # ── encode ──────────────────────────────────────────────────────────────
    enc_p = sub.add_parser("encode", help="Encrypt a file into a key image")
    enc_p.add_argument("--input",      required=True, help="File to encrypt (pdf/docx/xlsx/csv/image)")
    enc_p.add_argument("--key",        required=True, help="Base key image (.png/.jpg)")
    enc_p.add_argument("--output-dir", default=None,  help="Directory for outputs (default: same as input)")
    enc_p.set_defaults(func=cmd_encode)

    # ── decode ──────────────────────────────────────────────────────────────
    dec_p = sub.add_parser("decode", help="Decrypt a file from an encrypted image")
    dec_p.add_argument("--input",      required=True, help="Encrypted image (.png)")
    dec_p.add_argument("--key",        required=True, help="Key image used during encryption")
    dec_p.add_argument("--config",     required=True, help="Config JSON file (e.g. report.config.json)")
    dec_p.add_argument("--output-dir", default=None,  help="Directory for recovered file (default: same as input)")
    dec_p.set_defaults(func=cmd_decode)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
