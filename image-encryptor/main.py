#!/usr/bin/env python3
"""
Crout Holdings Image Encryptor — CLI entry point.
Naming convention:
  input: report.pdf
  key:   key.png
  out:   report-encrypted.png   (auto-derived)
  cfg:   report.config.json     (auto-derived)

With AES-256-GCM passphrase:
  python main.py encode --input report.pdf --key key.png --passphrase "my secret"
  python main.py decode --input report-encrypted.png --key key.png \
                        --config report.config.json --passphrase "my secret"
"""

import argparse
import getpass
import sys
from pathlib import Path
from encryptor import (
    DEFAULT_STRICT_SIZE_DELTA_PCT,
    EncodeError,
    Encryptor,
    encrypted_name_for,
)
from key_manager import KeyManager


def derive_names(
    input_path: Path,
    key_path: Path,
    output_dir: Path | None = None,
) -> tuple[Path, Path]:
    """Given an input file path, return (encrypted_output_path, config_path)."""
    stem     = input_path.stem
    base_dir = output_dir or input_path.parent
    carrier_format = KeyManager(key_path).format()
    encrypted = base_dir / encrypted_name_for(input_path, carrier_format)
    config    = base_dir / f"{stem}.config.json"
    return encrypted, config


def resolve_passphrase(args_passphrase: str | None, prompt: bool) -> str | None:
    """Return the passphrase string, prompting securely if --prompt-passphrase used."""
    if prompt:
        pw = getpass.getpass("Passphrase: ")
        confirm = getpass.getpass("Confirm passphrase: ")
        if pw != confirm:
            sys.exit("[error] Passphrases do not match.")
        return pw or None
    return args_passphrase or None


def cmd_encode(args):
    input_path = Path(args.input)
    key_path   = Path(args.key)
    output_dir = Path(args.output_dir) if args.output_dir else None

    if not input_path.exists():
        sys.exit(f"[error] Input file not found: {input_path}")
    if not key_path.exists():
        sys.exit(f"[error] Key image not found: {key_path}")

    passphrase = resolve_passphrase(args.passphrase, args.prompt_passphrase)

    encrypted_path, config_path = derive_names(input_path, key_path, output_dir)
    strict_size_delta_pct = None if args.allow_oversize else args.strict_size_delta_pct

    enc = Encryptor()
    try:
        enc.encode(
            input_path=input_path,
            key_path=key_path,
            output_path=encrypted_path,
            config_path=config_path,
            passphrase=passphrase,
            strict_size_delta_pct=strict_size_delta_pct,
        )
    except EncodeError as exc:
        sys.exit(f"[error] {exc.code}: {exc.message}\n{exc.to_dict()}")
    mode = "AES-256-GCM + LSB" if passphrase else "LSB only"
    print(f"[ok] Mode       → {mode}")
    print(f"[ok] Encrypted  → {encrypted_path}")
    print(f"[ok] Config     → {config_path}")


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

    passphrase = resolve_passphrase(args.passphrase, args.prompt_passphrase)

    enc = Encryptor()
    output_path = enc.decode(
        encrypted_path=encrypted_path,
        key_path=key_path,
        config_path=config_path,
        output_dir=Path(args.output_dir) if args.output_dir else encrypted_path.parent,
        passphrase=passphrase,
    )
    print(f"[ok] Recovered  → {output_path}")


def main():
    parser = argparse.ArgumentParser(
        prog="image-encryptor",
        description="Crout Holdings Image Encryption Algorithm",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # ── shared passphrase flags (added to both subcommands) ─────────────────
    def add_passphrase_args(p):
        group = p.add_mutually_exclusive_group()
        group.add_argument(
            "--passphrase", "-p",
            default=None,
            metavar="PASSPHRASE",
            help="AES-256-GCM passphrase (or use --prompt-passphrase for secure input)",
        )
        group.add_argument(
            "--prompt-passphrase",
            action="store_true",
            default=False,
            help="Prompt for passphrase securely (hides input, confirms on encode)",
        )

    # ── encode ──────────────────────────────────────────────────────────────
    enc_p = sub.add_parser("encode", help="Encrypt a file into a key image")
    enc_p.add_argument("--input",      required=True, help="File to encrypt (pdf/docx/xlsx/csv/image)")
    enc_p.add_argument("--key",        required=True, help="Base key image (.png/.jpg)")
    enc_p.add_argument("--output-dir", default=None,  help="Directory for outputs (default: same as input)")
    enc_p.add_argument(
        "--strict-size-delta-pct",
        type=float,
        default=DEFAULT_STRICT_SIZE_DELTA_PCT,
        help="Fail encode if output differs from carrier size by more than this percent.",
    )
    enc_p.add_argument(
        "--allow-oversize",
        action="store_true",
        default=False,
        help="Disable strict size-delta enforcement.",
    )
    add_passphrase_args(enc_p)
    enc_p.set_defaults(func=cmd_encode)

    # ── decode ──────────────────────────────────────────────────────────────
    dec_p = sub.add_parser("decode", help="Decrypt a file from an encrypted image")
    dec_p.add_argument("--input",      required=True, help="Encrypted image (.png)")
    dec_p.add_argument("--key",        required=True, help="Key image used during encryption")
    dec_p.add_argument("--config",     required=True, help="Config JSON (e.g. report.config.json)")
    dec_p.add_argument("--output-dir", default=None,  help="Directory for recovered file (default: same as input)")
    add_passphrase_args(dec_p)
    dec_p.set_defaults(func=cmd_decode)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
