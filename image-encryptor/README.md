# 🔐 Image Encryption Algorithm

A semantic image encryption prototype for **Crout Holdings**.

This version implements the redesigned architecture:

- The **encrypted image** stores encoded values.
- A separate **config file** stores `{ key, pixel_index, value_type }` entries.
- The **key image is private** and is never required to be shared.
- Decryption requires:
  1. encrypted image
  2. config file
  3. private key image

---

## Core Concept

Instead of treating every file as a raw byte blob, files are decomposed into **semantic key-value entries**.

Examples:

- `meta.original_extension = png`
- `image.width = 400`
- `image.height = 300`
- `pixel.0 = 255,128,0`
- `Sheet1!R1C1 = Revenue`
- `Sheet1!R2C2 = 1500`

Each semantic entry is assigned to a pixel index. The config stores the mapping:

```json
{
  "key": "image.width",
  "pixel_index": 42,
  "value_type": "int"
}
```

The pixel value at that index stores the encoded data using a delta against the private key image.

---

## Files Produced

### Encrypt

```bash
python main.py encode \
  --key ./demo/orignals/key.png \
  --input ./demo/orignals/test.png \
  --output-image ./demo/encrypted/encrypted.png \
  --output-config ./demo/encrypted/encrypted.config.json
```

### Decrypt

```bash
python main.py decode \
  --key ./demo/orignals/key.png \
  --input-image ./demo/encrypted/encrypted.png \
  --input-config ./demo/encrypted/encrypted.config.json \
  --output ./demo/decrypted/recovered.png
```

---

## Supported Types

- PDF → currently stored as base64 chunked semantic entries
- DOCX / DOC → currently stored as base64 chunked semantic entries
- XLSX / CSV → semantic cell entries
- Images (PNG / JPG / BMP) → metadata + per-pixel semantic entries

---

## Architecture

```text
image-encryptor/
├── main.py
├── encryptor.py
├── config_manager.py
├── file_type.py
├── key_manager.py
├── pixel_mapper.py
├── semantic_types.py
├── decomposers/
│   ├── base.py
│   ├── pdf_decomposer.py
│   ├── docx_decomposer.py
│   ├── xlsx_decomposer.py
│   └── image_decomposer.py
└── README.md
```

---

## Security Model

### Public / Shared
- Encrypted image
- Config file

### Private
- Key image

Config alone is insufficient because the actual value is delta-encoded against the private key image's original pixel value.

Encrypted image alone is insufficient because the attacker does not know what each pixel semantically represents.

---

## Notes

This is a prototype and is optimized for **clarity of architecture**, not maximum compression or production-grade cryptography.

Future improvements:
- AES pre-encryption layer
- pixel shuffle seeded from config key
- chunk packing for large strings
- binary config format
- compression before chunking
