"""CLI entry point for the Image Encryption Algorithm.

Usage
-----
  # Encrypt
  python main.py encode --key base.png --input report.pdf --output encrypted.png

  # Decrypt
  python main.py decode --key base.png --input encrypted.png --output recovered.pdf
"""

import argparse
import sys
from pathlib import Path

from encryptor import ImageEncryptor


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="image-encryptor",
        description="Steganographic file-to-image encryptor — Crout Holdings",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples:\n"
            "  python main.py encode --key secret.png "
            "--input report.pdf --output encrypted.png\n"
            "  python main.py decode --key secret.png "
            "--input encrypted.png --output recovered.pdf\n"
        ),
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # --- encode ---
    enc = sub.add_parser("encode", help="Encrypt a file into an image")
    enc.add_argument("-k", "--key",   required=True, help="Path to the secret key image")
    enc.add_argument("-i", "--input", required=True, help="Path to the file to encrypt")
    enc.add_argument("-o", "--output",required=True, help="Output encrypted image path (.png recommended)")

    # --- decode ---
    dec = sub.add_parser("decode", help="Decrypt a file from an encrypted image")
    dec.add_argument("-k", "--key",   required=True, help="Path to the secret key image")
    dec.add_argument("-i", "--input", required=True, help="Path to the encrypted image")
    dec.add_argument("-o", "--output",required=True, help="Output recovered file path")

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    # Validate key image exists
    if not Path(args.key).exists():
        print(f"[Error] Key image not found: {args.key}", file=sys.stderr)
        sys.exit(1)

    # Validate input exists
    if not Path(args.input).exists():
        print(f"[Error] Input file not found: {args.input}", file=sys.stderr)
        sys.exit(1)

    enc = ImageEncryptor(key_image_path=args.key)

    if args.command == "encode":
        enc.encode(input_file=args.input, output_image=args.output)
    elif args.command == "decode":
        enc.decode(encrypted_image=args.input, output_file=args.output)


if __name__ == "__main__":
    main()
