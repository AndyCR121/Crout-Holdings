"""
FastAPI bridge — exposes the Python encryptor to the browser UI.

Start:
    uvicorn api:app --reload --port 8787

Endpoints:
    POST /encode   multipart: file + key + optional passphrase
    POST /decode   multipart: encrypted_image + key + config + optional passphrase
    POST /test     no body   — runs full encode→decode round-trip on bundled demo assets
    GET  /health   liveness check
"""

import hashlib
import io
import json
import os
import shutil
import tempfile
import time
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

# ── optional: only import encryptor when available ──────────────────────────
try:
    from encryptor import ImageEncryptor
    _HAS_ENCRYPTOR = True
except ImportError:
    _HAS_ENCRYPTOR = False

app = FastAPI(title="Image Encryptor API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # UI is served from file:// or any localhost
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── demo asset paths (bundled next to api.py) ───────────────────────────────
DEMO_DIR   = Path(__file__).parent / "demo"
DEMO_FILE  = DEMO_DIR / "demo_input.png"   # file to encode
DEMO_KEY   = DEMO_DIR / "demo_key.png"     # key image


def _require_encryptor():
    if not _HAS_ENCRYPTOR:
        raise HTTPException(status_code=500, detail="Encryptor module not available.")


def _save_upload(upload: UploadFile, dest: Path):
    with dest.open("wb") as f:
        shutil.copyfileobj(upload.file, f)


def _fmt_bytes(b: int) -> str:
    if b < 1024:
        return f"{b} B"
    if b < 1_048_576:
        return f"{b/1024:.1f} KB"
    return f"{b/1_048_576:.2f} MB"


# ── /health ─────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "encryptor_available": _HAS_ENCRYPTOR}


# ── /encode ─────────────────────────────────────────────────────────────────
@app.post("/encode")
async def encode(
    file:       UploadFile = File(...),
    key:        UploadFile = File(...),
    passphrase: str        = Form(""),
):
    _require_encryptor()
    t0 = time.time()

    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        in_path  = tmp / file.filename
        key_path = tmp / key.filename

        _save_upload(file, in_path)
        _save_upload(key,  key_path)

        stem      = in_path.stem
        out_path  = tmp / f"{stem}-encrypted.png"
        cfg_path  = tmp / f"{stem}.config.json"

        enc = ImageEncryptor()
        enc.encode(
            input_path  = str(in_path),
            key_path    = str(key_path),
            output_path = str(out_path),
            passphrase  = passphrase or None,
        )

        out_size = out_path.stat().st_size
        in_size  = in_path.stat().st_size

        cfg_data = json.loads(cfg_path.read_text()) if cfg_path.exists() else {}

        return JSONResponse({
            "ok":             True,
            "elapsed_s":      round(time.time() - t0, 2),
            "input_filename": file.filename,
            "input_size":     in_size,
            "input_size_fmt": _fmt_bytes(in_size),
            "output_filename": out_path.name,
            "output_size":    out_size,
            "output_size_fmt": _fmt_bytes(out_size),
            "config_filename": cfg_path.name,
            "config":         cfg_data,
            # NOTE: in production you'd stream the file back;
            # for the demo the CLI command is the delivery mechanism.
            "message": (
                f"Encoded {file.filename} → {out_path.name} "
                f"({_fmt_bytes(in_size)} → {_fmt_bytes(out_size)}) "
                f"in {round(time.time()-t0,2)}s"
            ),
        })


# ── /decode ─────────────────────────────────────────────────────────────────
@app.post("/decode")
async def decode(
    encrypted_image: UploadFile = File(...),
    key:             UploadFile = File(...),
    config:          UploadFile = File(...),
    passphrase:      str        = Form(""),
):
    _require_encryptor()
    t0 = time.time()

    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        enc_path = tmp / encrypted_image.filename
        key_path = tmp / key.filename
        cfg_path = tmp / config.filename

        _save_upload(encrypted_image, enc_path)
        _save_upload(key,             key_path)
        _save_upload(config,          cfg_path)

        cfg_data    = json.loads(cfg_path.read_text())
        orig_name   = cfg_data.get("original_filename", "recovered_file")
        out_path    = tmp / orig_name

        enc = ImageEncryptor()
        enc.decode(
            input_path  = str(enc_path),
            key_path    = str(key_path),
            config_path = str(cfg_path),
            output_path = str(out_path),
            passphrase  = passphrase or None,
        )

        out_size = out_path.stat().st_size if out_path.exists() else 0

        return JSONResponse({
            "ok":               True,
            "elapsed_s":        round(time.time() - t0, 2),
            "recovered_filename": orig_name,
            "recovered_size":   out_size,
            "recovered_size_fmt": _fmt_bytes(out_size),
            "message": (
                f"Decoded → {orig_name} ({_fmt_bytes(out_size)}) "
                f"in {round(time.time()-t0,2)}s"
            ),
        })


# ── /test ────────────────────────────────────────────────────────────────────
@app.post("/test")
def run_test():
    """
    Full encode→decode round-trip on the bundled demo assets.
    Returns a structured result with:
      - encode: input size, output (encrypted) size, size delta
      - decode: recovered size, byte-accuracy vs original, hash match
    """
    _require_encryptor()

    if not DEMO_FILE.exists() or not DEMO_KEY.exists():
        raise HTTPException(
            status_code=404,
            detail=(
                f"Demo assets not found. "
                f"Expected:\n  {DEMO_FILE}\n  {DEMO_KEY}\n"
                "Place two PNG images in image-encryptor/demo/ named "
                "'demo_input.png' and 'demo_key.png'."
            ),
        )

    steps = []
    t_total = time.time()

    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)

        # ── copy demo assets ─────────────────────────────────────────────
        in_path  = tmp / DEMO_FILE.name
        key_path = tmp / DEMO_KEY.name
        shutil.copy(DEMO_FILE, in_path)
        shutil.copy(DEMO_KEY,  key_path)

        in_size      = in_path.stat().st_size
        key_orig_size = key_path.stat().st_size

        steps.append({
            "step":    "load",
            "label":   "Loaded demo assets",
            "detail":  f"Input: {_fmt_bytes(in_size)} | Key: {_fmt_bytes(key_orig_size)}",
            "status":  "ok",
        })

        # ── encode ───────────────────────────────────────────────────────
        stem       = in_path.stem
        enc_out    = tmp / f"{stem}-encrypted.png"
        cfg_out    = tmp / f"{stem}.config.json"
        t0 = time.time()

        try:
            enc = ImageEncryptor()
            enc.encode(
                input_path  = str(in_path),
                key_path    = str(key_path),
                output_path = str(enc_out),
                passphrase  = None,
            )
            enc_size      = enc_out.stat().st_size
            enc_elapsed   = round(time.time() - t0, 3)
            size_delta    = enc_size - key_orig_size
            size_delta_pct = round((size_delta / key_orig_size) * 100, 1)

            steps.append({
                "step":    "encode",
                "label":   "Encode complete",
                "detail": (
                    f"Key original: {_fmt_bytes(key_orig_size)} → "
                    f"Encrypted: {_fmt_bytes(enc_size)} "
                    f"(Δ {'+' if size_delta>=0 else ''}{_fmt_bytes(abs(size_delta))} / "
                    f"{'+' if size_delta_pct>=0 else ''}{size_delta_pct}%)"
                ),
                "elapsed_s":       enc_elapsed,
                "key_orig_size":   key_orig_size,
                "encrypted_size":  enc_size,
                "size_delta_bytes": size_delta,
                "size_delta_pct":  size_delta_pct,
                "status": "ok",
            })
        except Exception as ex:
            steps.append({"step": "encode", "label": "Encode failed", "detail": str(ex), "status": "error"})
            return JSONResponse({"ok": False, "steps": steps, "elapsed_s": round(time.time()-t_total,2)}, status_code=500)

        # ── decode ───────────────────────────────────────────────────────
        recovered = tmp / in_path.name
        t0 = time.time()

        try:
            enc2 = ImageEncryptor()
            enc2.decode(
                input_path  = str(enc_out),
                key_path    = str(key_path),
                config_path = str(cfg_out),
                output_path = str(recovered),
                passphrase  = None,
            )
            dec_elapsed   = round(time.time() - t0, 3)
            rec_size      = recovered.stat().st_size

            # ── byte accuracy ────────────────────────────────────────────
            orig_bytes      = in_path.read_bytes()
            rec_bytes       = recovered.read_bytes()
            compare_len     = min(len(orig_bytes), len(rec_bytes))
            matching_bytes  = sum(a == b for a, b in zip(orig_bytes[:compare_len], rec_bytes[:compare_len]))
            accuracy_pct    = round((matching_bytes / len(orig_bytes)) * 100, 4) if orig_bytes else 0.0
            orig_hash       = hashlib.sha256(orig_bytes).hexdigest()
            rec_hash        = hashlib.sha256(rec_bytes).hexdigest()
            hash_match      = orig_hash == rec_hash

            steps.append({
                "step":            "decode",
                "label":           "Decode complete",
                "detail": (
                    f"Recovered: {_fmt_bytes(rec_size)} | "
                    f"Accuracy: {accuracy_pct}% | "
                    f"SHA-256 match: {'✓' if hash_match else '✗'}"
                ),
                "elapsed_s":       dec_elapsed,
                "original_size":   in_size,
                "recovered_size":  rec_size,
                "matching_bytes":  matching_bytes,
                "total_bytes":     len(orig_bytes),
                "accuracy_pct":    accuracy_pct,
                "original_sha256": orig_hash,
                "recovered_sha256": rec_hash,
                "hash_match":      hash_match,
                "status":          "ok" if hash_match else "warn",
            })
        except Exception as ex:
            steps.append({"step": "decode", "label": "Decode failed", "detail": str(ex), "status": "error"})
            return JSONResponse({"ok": False, "steps": steps, "elapsed_s": round(time.time()-t_total,2)}, status_code=500)

    # ── summary ──────────────────────────────────────────────────────────
    enc_step = next(s for s in steps if s["step"] == "encode")
    dec_step = next(s for s in steps if s["step"] == "decode")

    return JSONResponse({
        "ok":            True,
        "elapsed_s":     round(time.time() - t_total, 2),
        "steps":         steps,
        "summary": {
            "input_file":        DEMO_FILE.name,
            "key_file":          DEMO_KEY.name,
            "input_size":        in_size,
            "input_size_fmt":    _fmt_bytes(in_size),
            "key_orig_size":     key_orig_size,
            "key_orig_size_fmt": _fmt_bytes(key_orig_size),
            "encrypted_size":    enc_step["encrypted_size"],
            "encrypted_size_fmt": _fmt_bytes(enc_step["encrypted_size"]),
            "size_delta_bytes":  enc_step["size_delta_bytes"],
            "size_delta_pct":    enc_step["size_delta_pct"],
            "recovered_size":    dec_step["recovered_size"],
            "recovered_size_fmt": _fmt_bytes(dec_step["recovered_size"]),
            "accuracy_pct":      dec_step["accuracy_pct"],
            "hash_match":        dec_step["hash_match"],
            "encode_elapsed_s":  enc_step["elapsed_s"],
            "decode_elapsed_s":  dec_step["elapsed_s"],
        },
    })
