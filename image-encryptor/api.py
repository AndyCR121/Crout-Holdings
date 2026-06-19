"""
Image Encryptor — FastAPI backend

Start:
    uvicorn api:app --reload --port 8787

Endpoints:
    GET  /health   liveness + encryptor status
    POST /encode   multipart: file + key -> zip(stem-encrypted.png, stem.config.json)
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

DEMO_DIR  = Path(__file__).parent / "demo" / "orignals"
DEMO_KEY  = DEMO_DIR / "key.png"
DEMO_FILE = DEMO_DIR / "small_test.png"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_encryptor_class():
    try:
        from encryptor import Encryptor
        return Encryptor
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Encryptor unavailable: {exc}")


async def _save_upload(upload: UploadFile, dest: Path) -> None:
    dest.write_bytes(await upload.read())


def _fmt(n: int) -> str:
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
        from encryptor import Encryptor  # noqa
        ok = True
    except Exception:
        ok = False
    return {"status": "ok", "encryptor_available": ok}


@app.post("/encode")
async def encode(
    file: UploadFile = File(...),
    key:  UploadFile = File(...),
    passphrase: str  = Form(""),
):
    Encryptor = _get_encryptor_class()

    with tempfile.TemporaryDirectory() as _tmp:
        tmp        = Path(_tmp)
        input_path = tmp / file.filename
        key_path   = tmp / key.filename
        await _save_upload(file, input_path)
        await _save_upload(key,  key_path)

        stem       = input_path.stem
        out_image  = tmp / f"{stem}-encrypted.png"
        out_config = tmp / f"{stem}.config.json"

        try:
            enc = Encryptor()
            enc.encode(
                input_path=input_path,
                key_path=key_path,
                output_path=out_image,
                config_path=out_config,
                passphrase=passphrase or None,
            )
        except OverflowError as exc:
            raise HTTPException(status_code=422, detail=str(exc))
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc))

        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            zf.write(out_image,  out_image.name)
            zf.write(out_config, out_config.name)
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
    Encryptor = _get_encryptor_class()

    with tempfile.TemporaryDirectory() as _tmp:
        tmp      = Path(_tmp)
        img_path = tmp / encrypted_image.filename
        key_path = tmp / key.filename
        cfg_path = tmp / config.filename
        out_dir  = tmp / "out"
        out_dir.mkdir()

        await _save_upload(encrypted_image, img_path)
        await _save_upload(key,             key_path)
        await _save_upload(config,          cfg_path)

        cfg_data          = json.loads(cfg_path.read_text())
        original_filename = cfg_data.get("original_filename", "recovered_file")

        try:
            enc = Encryptor()
            recovered = enc.decode(
                encrypted_path=img_path,
                key_path=key_path,
                config_path=cfg_path,
                output_dir=out_dir,
                passphrase=passphrase or None,
            )
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc))

        out_file = recovered if isinstance(recovered, Path) else (out_dir / original_filename)
        return StreamingResponse(
            io.BytesIO(out_file.read_bytes()),
            media_type="application/octet-stream",
            headers={"Content-Disposition": f'attachment; filename="{original_filename}"'},
        )


@app.post("/test")
def run_test():
    Encryptor = _get_encryptor_class()
    steps  = []
    passed = True

    # Auto-create small_test.png if missing
    if not DEMO_KEY.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Demo key not found: {DEMO_KEY} — add key.png to demo/orignals/",
        )
    if not DEMO_FILE.exists():
        try:
            from PIL import Image as PILImage
            DEMO_FILE.parent.mkdir(parents=True, exist_ok=True)
            PILImage.new("RGB", (200, 200), color=(100, 149, 237)).save(str(DEMO_FILE))
            steps.append({"name": "Setup", "status": "ok",
                          "detail": "Auto-created 200x200 small_test.png in demo/orignals/"})
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Cannot create demo file: {exc}")

    with tempfile.TemporaryDirectory() as _tmp:
        tmp        = Path(_tmp)
        out_image  = tmp / "test-encrypted.png"
        out_config = tmp / "test.config.json"
        out_dir    = tmp / "decoded"
        out_dir.mkdir()

        # Step 1 — Encode
        t0 = time.perf_counter()
        try:
            Encryptor().encode(
                input_path=DEMO_FILE,
                key_path=DEMO_KEY,
                output_path=out_image,
                config_path=out_config,
            )
            enc_ms       = round((time.perf_counter() - t0) * 1000)
            key_size     = DEMO_KEY.stat().st_size
            enc_size     = out_image.stat().st_size
            delta_pct    = round((enc_size - key_size) / key_size * 100, 2)
            steps.append({
                "name": "Encode", "status": "ok", "ms": enc_ms,
                "detail": f"Key: {_fmt(key_size)}  Encrypted: {_fmt(enc_size)}  Delta: {'+' if delta_pct >= 0 else ''}{delta_pct}%",
                "key_size_bytes": key_size, "enc_size_bytes": enc_size, "size_delta_pct": delta_pct,
            })
        except Exception as exc:
            steps.append({"name": "Encode", "status": "fail", "detail": str(exc)})
            passed = False

        # Step 2 — Decode
        if passed:
            t0 = time.perf_counter()
            try:
                recovered = Encryptor().decode(
                    encrypted_path=out_image,
                    key_path=DEMO_KEY,
                    config_path=out_config,
                    output_dir=out_dir,
                )
                dec_ms = round((time.perf_counter() - t0) * 1000)
                out_file = recovered if isinstance(recovered, Path) else next(out_dir.iterdir(), None)
                steps.append({
                    "name": "Decode", "status": "ok", "ms": dec_ms,
                    "detail": f"Recovered: {_fmt(out_file.stat().st_size) if out_file else 'unknown'}",
                })
            except Exception as exc:
                steps.append({"name": "Decode", "status": "fail", "detail": str(exc)})
                passed = False
                out_file = None

        # Step 3 — Compare
        accuracy  = 0.0
        sha_match = False
        if passed and out_file and out_file.exists():
            orig    = DEMO_FILE.read_bytes()
            decoded = out_file.read_bytes()
            sha_match = hashlib.sha256(orig).hexdigest() == hashlib.sha256(decoded).hexdigest()
            if orig:
                accuracy = round(sum(a == b for a, b in zip(orig, decoded)) / len(orig) * 100, 4)
            steps.append({
                "name": "Content Match",
                "status": "ok" if sha_match else "warn",
                "detail": f"Original: {_fmt(len(orig))}  Decoded: {_fmt(len(decoded))}  SHA-256: {sha_match}  Accuracy: {accuracy}%",
                "sha_match": sha_match,
                "accuracy_pct": accuracy,
                "original_size_bytes": len(orig),
                "decoded_size_bytes": len(decoded),
            })
            if not sha_match:
                passed = False

        return JSONResponse({
            "passed": passed,
            "steps": steps,
            "summary": {
                "accuracy_pct": accuracy,
                "sha_match": sha_match,
                "size_delta_pct": next(
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
