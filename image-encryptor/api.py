"""
Image Encryptor — FastAPI backend

Start:
    uvicorn api:app --reload --port 8787

Endpoints:
    GET  /health   liveness + encryptor status
    POST /encode   multipart: file + key  -> zip(stem-encrypted.png, stem.config.json)
    POST /decode   multipart: encrypted_image + key + config -> original file
    POST /test     no body - full encode->decode round-trip on bundled demo assets
"""

import hashlib
import io
import json
import tempfile
import time
import zipfile
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(title="Image Encryptor API", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DEMO_DIR  = Path(__file__).parent / "test_files"
DEMO_KEY  = DEMO_DIR / "key.png"
DEMO_FILE = DEMO_DIR / "small_test.png"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_encryptor_class():
    try:
        from encryptor import EncodeError, Encryptor, encrypted_name_for
        from key_manager import KeyManager
        return Encryptor, EncodeError, encrypted_name_for, KeyManager
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Encryptor unavailable: {exc}")


async def _save_upload(upload: UploadFile, dest: Path) -> None:
    dest.write_bytes(await upload.read())


def _fmt_bytes(n: int) -> str:
    size = float(n)
    for unit in ("B", "KB", "MB", "GB"):
        if size < 1024:
            return f"{size:.1f} {unit}"
        size /= 1024
    return f"{size:.1f} GB"

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
    file:       UploadFile = File(...),
    key:        UploadFile = File(...),
    passphrase: str        = Form(""),
):
    Encryptor, EncodeError, encrypted_name_for, KeyManager = _get_encryptor_class()
    with tempfile.TemporaryDirectory() as _tmp:
        tmp        = Path(_tmp)
        input_path = tmp / Path(file.filename or "input.bin").name
        key_path = tmp / Path(key.filename or "key.png").name
        await _save_upload(file, input_path)
        await _save_upload(key,  key_path)

        stem        = input_path.stem
        carrier_format = KeyManager(key_path).format()
        output_path = tmp / encrypted_name_for(input_path, carrier_format)
        config_path = tmp / f"{stem}.config.json"

        try:
            enc = Encryptor()
            enc.encode(
                input_path  = input_path,
                key_path    = key_path,
                output_path = output_path,
                config_path = config_path,
                passphrase  = passphrase or None,
            )
        except EncodeError as exc:
            raise HTTPException(status_code=422, detail=exc.to_dict())
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc))

        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            zf.write(output_path, output_path.name)
            zf.write(config_path, config_path.name)
        buf.seek(0)

        return StreamingResponse(
            buf,
            media_type="application/zip",
            headers={"Content-Disposition": f'attachment; filename="{stem}-encrypted.zip"'},
        )


@app.post("/decode")
async def decode(
    encrypted_image: UploadFile = File(...),
    key:             UploadFile = File(...),
    config:          UploadFile = File(...),
    passphrase: str             = Form(""),
):
    Encryptor, _, _, _ = _get_encryptor_class()
    with tempfile.TemporaryDirectory() as _tmp:
        tmp            = Path(_tmp)
        encrypted_path = tmp / Path(encrypted_image.filename or "encrypted.png").name
        key_path = tmp / Path(key.filename or "key.png").name
        config_path = tmp / Path(config.filename or "config.json").name
        await _save_upload(encrypted_image, encrypted_path)
        await _save_upload(key,             key_path)
        await _save_upload(config,          config_path)

        cfg_data          = json.loads(config_path.read_text())
        original_filename = cfg_data.get("original_filename", "recovered_file")
        output_dir        = tmp / "out"
        output_dir.mkdir()

        try:
            enc = Encryptor()
            enc.decode(
                encrypted_path = encrypted_path,
                key_path       = key_path,
                config_path    = config_path,
                output_dir     = output_dir,
                passphrase     = passphrase or None,
            )
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc))

        recovered = next(output_dir.iterdir(), None)
        if not recovered:
            raise HTTPException(status_code=500, detail="Decoder produced no output file.")

        return StreamingResponse(
            io.BytesIO(recovered.read_bytes()),
            media_type="application/octet-stream",
            headers={"Content-Disposition": f'attachment; filename="{original_filename}"'},
        )


@app.post("/test")
def run_test():
    Encryptor, EncodeError, encrypted_name_for, KeyManager = _get_encryptor_class()
    steps  = []
    passed = True

    if not DEMO_KEY.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Demo key not found: {DEMO_KEY}. Add key.png to image-encryptor/demo/orignals/",
        )

    # Auto-create a small source image if one doesn't exist
    if not DEMO_FILE.exists():
        try:
            from PIL import Image as PILImage
            PILImage.new("RGB", (200, 200), color=(100, 149, 237)).save(str(DEMO_FILE))
            steps.append({"name": "Setup", "status": "ok", "detail": "Auto-generated 200x200 demo source image (small_test.png)"})
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Could not create demo file: {exc}")

    with tempfile.TemporaryDirectory() as _tmp:
        tmp         = Path(_tmp)
        carrier_format = KeyManager(DEMO_KEY).format()
        out_image   = tmp / encrypted_name_for(DEMO_FILE, carrier_format)
        out_config  = tmp / "test.config.json"
        out_dir     = tmp / "decoded"
        out_dir.mkdir()

        # Step 1: Encode
        t0 = time.perf_counter()
        try:
            Encryptor().encode(
                input_path  = DEMO_FILE,
                key_path    = DEMO_KEY,
                output_path = out_image,
                config_path = out_config,
            )
            enc_ms  = round((time.perf_counter() - t0) * 1000)
            key_sz  = DEMO_KEY.stat().st_size
            enc_sz  = out_image.stat().st_size
            delta   = round((enc_sz - key_sz) / key_sz * 100, 2)
            steps.append({
                "name":   "Encode",
                "status": "ok",
                "ms":     enc_ms,
                "detail": f"Key: {_fmt_bytes(key_sz)}  Encrypted: {_fmt_bytes(enc_sz)}  Delta: {'+' if delta >= 0 else ''}{delta}%",
                "key_size_bytes": key_sz,
                "enc_size_bytes": enc_sz,
                "size_delta_pct": delta,
            })
            if abs(delta) > 1.0:
                steps[-1]["status"] = "fail"
                steps[-1]["detail"] += "  Size delta exceeds +/-1.0%."
                passed = False
        except EncodeError as exc:
            steps.append({"name": "Encode", "status": "fail", "detail": exc.message, "error": exc.to_dict()})
            passed = False
        except Exception as exc:
            steps.append({"name": "Encode", "status": "fail", "detail": str(exc)})
            passed = False

        # Step 2: Decode
        if passed:
            t0 = time.perf_counter()
            try:
                Encryptor().decode(
                    encrypted_path = out_image,
                    key_path       = DEMO_KEY,
                    config_path    = out_config,
                    output_dir     = out_dir,
                )
                dec_ms    = round((time.perf_counter() - t0) * 1000)
                recovered = next(out_dir.iterdir(), None)
                steps.append({
                    "name":   "Decode",
                    "status": "ok",
                    "ms":     dec_ms,
                    "detail": f"Recovered: {recovered.name if recovered else '?'}  ({_fmt_bytes(recovered.stat().st_size) if recovered else '0 B'})",
                })
            except Exception as exc:
                steps.append({"name": "Decode", "status": "fail", "detail": str(exc)})
                passed = False

        # Step 3: Content comparison
        accuracy  = 0.0
        sha_match = False
        if passed:
            recovered = next(out_dir.iterdir(), None)
            if recovered and recovered.exists():
                orig    = DEMO_FILE.read_bytes()
                decoded = recovered.read_bytes()
                sha_match = hashlib.sha256(orig).hexdigest() == hashlib.sha256(decoded).hexdigest()
                if orig:
                    accuracy = round(sum(a == b for a, b in zip(orig, decoded)) / len(orig) * 100, 4)
                steps.append({
                    "name":   "Content Match",
                    "status": "ok" if sha_match else "warn",
                    "detail": (
                        f"Original: {_fmt_bytes(len(orig))}  "
                        f"Decoded: {_fmt_bytes(len(decoded))}  "
                        f"SHA-256 match: {sha_match}  "
                        f"Byte accuracy: {accuracy}%"
                    ),
                    "sha_match":           sha_match,
                    "accuracy_pct":        accuracy,
                    "original_size_bytes": len(orig),
                    "decoded_size_bytes":  len(decoded),
                })
                if not sha_match:
                    passed = False

        size_delta = next((s.get("size_delta_pct") for s in steps if s["name"] == "Encode"), None)
        return JSONResponse({
            "passed":  passed,
            "steps":   steps,
            "summary": {
                "accuracy_pct":   accuracy,
                "sha_match":      sha_match,
                "size_delta_pct": size_delta,
            },
        })


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8787, reload=True)
