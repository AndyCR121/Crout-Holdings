"""
Image Encryptor — FastAPI backend

Start:
    uvicorn api:app --reload --port 8787

Endpoints:
    GET  /health          liveness + encryptor status
    POST /encode          multipart: file + key  -> zip(encrypted.png, name.config.json)
    POST /decode          multipart: encrypted_image + key + config -> original file
    POST /test            no body - full encode->decode round-trip on demo assets
"""

import hashlib
import io
import json
import os
import shutil
import tempfile
import time
import zipfile
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
app = FastAPI(title="Image Encryptor API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Demo assets bundled with the repo (used by /test)
DEMO_DIR  = Path(__file__).parent / "demo" / "orignals"
DEMO_KEY  = DEMO_DIR / "key.png"
DEMO_FILE = DEMO_DIR / "small_test.png"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _load_encryptor():
    """Import Encryptor lazily so the API still starts if deps are missing."""
    try:
        from encryptor import Encryptor
        return Encryptor
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Encryptor unavailable: {exc}")


async def _save_upload(upload: UploadFile, dest: Path) -> None:
    data = await upload.read()
    dest.write_bytes(data)


def _fmt_bytes(n: int) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024:
            return f"{n:.1f} {unit}"
        n /= 1024
    return f"{n:.1f} GB"


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    try:
        from encryptor import Encryptor  # noqa: F401
        enc_ok = True
    except Exception:
        enc_ok = False
    return {"status": "ok", "encryptor_available": enc_ok}


@app.post("/encode")
async def encode(
    file: UploadFile = File(...),
    key:  UploadFile = File(...),
    passphrase: str  = Form(""),
):
    """
    Accepts the input file + key image.
    Returns a ZIP containing:
        <stem>-encrypted.png
        <stem>.config.json
    """
    Encryptor = _load_encryptor()

    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)

        input_path = tmp / file.filename
        key_path   = tmp / key.filename
        await _save_upload(file, input_path)
        await _save_upload(key,  key_path)

        stem           = input_path.stem
        out_image      = tmp / f"{stem}-encrypted.png"
        out_config     = tmp / f"{stem}.config.json"

        try:
            enc = Encryptor(key_path=str(key_path), passphrase=passphrase or None)
            enc.encode(
                input_file=str(input_path),
                output_image=str(out_image),
                output_config=str(out_config),
            )
        except OverflowError as e:
            raise HTTPException(status_code=422, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

        # Bundle both output files into a single ZIP streamed back
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            zf.write(out_image,  out_image.name)
            zf.write(out_config, out_config.name)
        buf.seek(0)

        zip_name = f"{stem}-encrypted.zip"
        return StreamingResponse(
            buf,
            media_type="application/zip",
            headers={"Content-Disposition": f'attachment; filename="{zip_name}"'},
        )


@app.post("/decode")
async def decode(
    encrypted_image: UploadFile = File(...),
    key:             UploadFile = File(...),
    config:          UploadFile = File(...),
    passphrase: str             = Form(""),
):
    """
    Accepts encrypted PNG + key image + config JSON.
    Returns the recovered original file.
    """
    Encryptor = _load_encryptor()

    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)

        img_path    = tmp / encrypted_image.filename
        key_path    = tmp / key.filename
        cfg_path    = tmp / config.filename
        await _save_upload(encrypted_image, img_path)
        await _save_upload(key,             key_path)
        await _save_upload(config,          cfg_path)

        # Read original filename from config
        cfg_data = json.loads(cfg_path.read_text())
        original_filename = cfg_data.get("original_filename", "recovered_file")
        out_path = tmp / f"recovered_{original_filename}"

        try:
            enc = Encryptor(key_path=str(key_path), passphrase=passphrase or None)
            enc.decode(
                input_image=str(img_path),
                input_config=str(cfg_path),
                output_file=str(out_path),
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

        file_bytes = out_path.read_bytes()
        mime = "application/octet-stream"
        return StreamingResponse(
            io.BytesIO(file_bytes),
            media_type=mime,
            headers={"Content-Disposition": f'attachment; filename="{original_filename}"'},
        )


@app.post("/test")
def run_test():
    """
    Full encode -> decode round-trip using bundled demo assets.
    Returns step-by-step metrics as JSON.
    """
    Encryptor = _load_encryptor()

    steps = []
    passed = True

    if not DEMO_KEY.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Demo key image not found at {DEMO_KEY}. "
                   "Add a key.png to image-encryptor/demo/orignals/"
        )
    if not DEMO_FILE.exists():
        # Auto-generate a tiny test image
        try:
            from PIL import Image as PILImage
            img = PILImage.new("RGB", (200, 200), color=(100, 149, 237))
            DEMO_FILE.parent.mkdir(parents=True, exist_ok=True)
            img.save(str(DEMO_FILE))
            steps.append({"name": "Setup", "status": "ok",
                          "detail": "Generated 200x200 demo source image (small_test.png)"})
        except Exception as e:
            raise HTTPException(status_code=500,
                                detail=f"Could not create demo file: {e}")

    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)

        out_image  = tmp / "test-encrypted.png"
        out_config = tmp / "test.config.json"
        out_decoded = tmp / "test-decoded.png"

        # -- Step 1: Encode --------------------------------------------------
        t0 = time.perf_counter()
        try:
            enc = Encryptor(key_path=str(DEMO_KEY))
            enc.encode(
                input_file=str(DEMO_FILE),
                output_image=str(out_image),
                output_config=str(out_config),
            )
            encode_ms = round((time.perf_counter() - t0) * 1000)
            key_size = DEMO_KEY.stat().st_size
            enc_size = out_image.stat().st_size
            size_delta_pct = round((enc_size - key_size) / key_size * 100, 2)
            steps.append({
                "name":   "Encode",
                "status": "ok",
                "ms":     encode_ms,
                "detail": (
                    f"Key: {_fmt_bytes(key_size)}  "
                    f"Encrypted: {_fmt_bytes(enc_size)}  "
                    f"Delta: {'+' if size_delta_pct >= 0 else ''}{size_delta_pct}%"
                ),
                "key_size_bytes": key_size,
                "enc_size_bytes": enc_size,
                "size_delta_pct": size_delta_pct,
            })
        except Exception as e:
            steps.append({"name": "Encode", "status": "fail", "detail": str(e)})
            passed = False

        # -- Step 2: Decode --------------------------------------------------
        if passed:
            t0 = time.perf_counter()
            try:
                enc = Encryptor(key_path=str(DEMO_KEY))
                enc.decode(
                    input_image=str(out_image),
                    input_config=str(out_config),
                    output_file=str(out_decoded),
                )
                decode_ms = round((time.perf_counter() - t0) * 1000)
                steps.append({
                    "name":   "Decode",
                    "status": "ok",
                    "ms":     decode_ms,
                    "detail": f"Recovered file written ({_fmt_bytes(out_decoded.stat().st_size)})",
                })
            except Exception as e:
                steps.append({"name": "Decode", "status": "fail", "detail": str(e)})
                passed = False

        # -- Step 3: Compare original vs decoded ----------------------------
        accuracy = 0.0
        sha_match = False
        if passed and out_decoded.exists():
            orig_bytes    = DEMO_FILE.read_bytes()
            decoded_bytes = out_decoded.read_bytes()

            sha_orig    = hashlib.sha256(orig_bytes).hexdigest()
            sha_decoded = hashlib.sha256(decoded_bytes).hexdigest()
            sha_match   = sha_orig == sha_decoded

            if len(orig_bytes) > 0:
                min_len   = min(len(orig_bytes), len(decoded_bytes))
                matches   = sum(a == b for a, b in zip(orig_bytes, decoded_bytes))
                accuracy  = round(matches / len(orig_bytes) * 100, 4)

            steps.append({
                "name":   "Content Match",
                "status": "ok" if sha_match else "warn",
                "detail": (
                    f"Original: {_fmt_bytes(len(orig_bytes))}  "
                    f"Decoded: {_fmt_bytes(len(decoded_bytes))}  "
                    f"SHA-256 match: {sha_match}  "
                    f"Byte accuracy: {accuracy}%"
                ),
                "sha_match": sha_match,
                "accuracy_pct": accuracy,
                "original_size_bytes": len(orig_bytes),
                "decoded_size_bytes":  len(decoded_bytes),
            })

            if not sha_match:
                passed = False

        return JSONResponse({
            "passed": passed,
            "steps":  steps,
            "summary": {
                "accuracy_pct":     accuracy,
                "sha_match":        sha_match,
                "size_delta_pct":   next(
                    (s.get("size_delta_pct") for s in steps if s["name"] == "Encode"), None
                ),
            },
        })


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8787, reload=True)
