# 🔐 Image Encryption Algorithm

A steganographic file-to-image encoder for **Crout Holdings**.

Takes any supported file, decomposes it into its raw byte / key-value stream, then encodes it **pixel-by-pixel** into a carrier image. The original carrier image acts as the **secret key** — without it, decoding is computationally infeasible.

---

## Supported File Types

| Format | Extension | Decomposition Strategy |
|--------|-----------|------------------------|
| PDF | `.pdf` | Raw byte stream (compressed internally) |
| Word | `.docx` / `.doc` | XML text + metadata key-value pairs |
| Excel | `.xlsx` / `.csv` | Row/column cell key-value pairs |
| Image | `.png` / `.jpg` / `.bmp` | Raw pixel RGB tuples |

---

## How It Works

```
┌─────────────────────────────────────────────────────────┐
│  1. Load base image → used as SECRET KEY (pixel map)    │
│  2. Decompose input file → [(key, value), ...]           │
│  3. Serialize to byte stream                             │
│  4. For each byte → encode into pixel channel (R/G/B)    │
│  5. Write file-type reference pixels                     │
│  6. Write EOF sentinel pixel (255, 0, 255)               │
│  7. Save encrypted image                                 │
└─────────────────────────────────────────────────────────┘
```

### Pixel Encoding Scheme

- Every **3 bytes** of payload → 1 pixel (R, G, B)
- Pixel **order** follows the secret key image's pixel sequence
- **File-type marker**: 3 pixels before EOF encode the file type as a known RGB triplet
- **EOF sentinel**: `(255, 0, 255)` — magenta pixel signals end of content

### File-Type Reference RGB Codes

| File Type | Marker Pixel (R, G, B) |
|-----------|------------------------|
| PDF | `(80, 68, 70)` — ASCII "PDF" |
| DOCX | `(68, 79, 67)` — ASCII "DOC" |
| XLSX | `(88, 76, 83)` — ASCII "XLS" |
| CSV | `(67, 83, 86)` — ASCII "CSV" |
| PNG | `(80, 78, 71)` — ASCII "PNG" |
| JPG | `(74, 80, 71)` — ASCII "JPG" |
| BMP | `(66, 77, 80)` — ASCII "BMP" |

---

## Installation

```bash
cd image-encryptor
pip install -r requirements.txt
```

## Usage

### Encode (Encrypt)

```bash
python main.py encode \
  --key base_image.png \
  --input secret_document.pdf \
  --output encrypted.png
```

### Decode (Decrypt)

```bash
python main.py decode \
  --key base_image.png \
  --input encrypted.png \
  --output recovered_document.pdf
```

### Python API

```python
from encryptor import ImageEncryptor

enc = ImageEncryptor(key_image_path="base_image.png")

# Encrypt
enc.encode(input_file="report.pdf", output_image="encrypted.png")

# Decrypt
enc.decode(encrypted_image="encrypted.png", output_file="recovered.pdf")
```

---

## Architecture

```
image-encryptor/
├── main.py              # CLI entry point
├── encryptor.py         # Core ImageEncryptor class
├── decomposers/
│   ├── __init__.py
│   ├── base.py          # BaseDecomposer interface
│   ├── pdf_decomposer.py
│   ├── docx_decomposer.py
│   ├── xlsx_decomposer.py
│   └── image_decomposer.py
├── pixel_mapper.py      # Byte ↔ Pixel RGB conversion
├── key_manager.py       # Secret key image loader & pixel index map
├── file_type.py         # File-type detection & marker pixels
├── requirements.txt
└── README.md
```

---

## Security Notes

- The **base image is the key**. Anyone without the exact base image cannot decode.
- The pixel ordering is derived from the key image's pixel sequence — a different image produces a completely different mapping.
- For production use, consider layering AES encryption on the byte stream before pixel encoding for dual-layer security.

---

> Crout Holdings PTY LTD — Internal R&D Tool
