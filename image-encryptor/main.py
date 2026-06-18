"""CLI for semantic config-based image encryption."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from encryptor import ImageEncryptor


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="image-encryptor",
        description="Semantic image encryptor with external config mapping",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    enc = sub.add_parser("encode", help="Encrypt a file into an image + config")
    enc.add_argument("--key", required=True, help="Private key image path")
    enc.add_argument("--input", required=True, help="Input file to encrypt")
    enc.add_argument("--output-image", required=True, help="Output encrypted image path")
    enc.add_argument("--output-config", required=True, help="Output config JSON path")

    dec = sub.add_parser("decode", help="Decrypt from encrypted image + config")
    dec.add_argument("--key", required=True, help="Private key image path")
    dec.add_argument("--input-image", required=True, help="Encrypted image path")
    dec.add_argument("--input-config", required=True, help="Config JSON path")
    dec.add_argument("--output", required=True, help="Recovered file path")

    return parser


def ensure_exists(path: str, label: str) -> None:
    if not Path(path).exists():
        print(f"[Error] {label} not found: {path}", file=sys.stderr)
        sys.exit(1)


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    ensure_exists(args.key, "Key image")

    encryptor = ImageEncryptor(args.key)

    if args.command == "encode":
        ensure_exists(args.input, "Input file")
        encryptor.encode(args.input, args.output_image, args.output_config)
    elif args.command == "decode":
        ensure_exists(args.input_image, "Encrypted image")
        ensure_exists(args.input_config, "Config file")
        encryptor.decode(args.input_image, args.input_config, args.output)


if __name__ == "__main__":
    main()
