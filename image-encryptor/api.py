"""Local REST API for Image Encryptor — run with: python api.py"""
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os, tempfile, traceback
from pathlib import Path
from encryptor import Encryptor

app = Flask(__name__)
CORS(app)  # allow requests from file:// or localhost UI


def _save_upload(file_storage, suffix=""):
    """Save an uploaded FileStorage to a temp file and return its Path."""
    fd, path = tempfile.mkstemp(suffix=suffix)
    os.close(fd)
    file_storage.save(path)
    return Path(path)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "version": "1.0"})


@app.route("/encode", methods=["POST"])
def encode():
    """
    Multipart form fields:
      input_file  — the file to encrypt
      key_image   — the base/key image
      output_dir  — (optional) directory path for outputs; defaults to tempdir

    Returns JSON:
      { success, original_filename, encrypted_filename, config_filename,
        encrypted_path, config_path, output_dir }
    """
    try:
        if "input_file" not in request.files or "key_image" not in request.files:
            return jsonify({"error": "Missing input_file or key_image"}), 400

        input_file = request.files["input_file"]
        key_image  = request.files["key_image"]
        output_dir = request.form.get("output_dir", "").strip()

        orig_name = input_file.filename
        stem      = Path(orig_name).stem

        if not output_dir:
            output_dir = tempfile.mkdtemp(prefix="imgenc_")
        else:
            os.makedirs(output_dir, exist_ok=True)

        input_ext = Path(orig_name).suffix
        tmp_input = _save_upload(input_file, suffix=input_ext)
        tmp_key   = _save_upload(key_image,  suffix=Path(key_image.filename).suffix)

        encrypted_path = Path(output_dir) / f"{stem}-encrypted.png"
        config_path    = Path(output_dir) / f"{stem}.config.json"

        enc = Encryptor()
        enc.encode(
            input_path=tmp_input,
            key_path=tmp_key,
            output_path=encrypted_path,
            config_path=config_path,
        )

        tmp_input.unlink(missing_ok=True)
        tmp_key.unlink(missing_ok=True)

        return jsonify({
            "success":            True,
            "original_filename":  orig_name,
            "encrypted_path":     str(encrypted_path),
            "config_path":        str(config_path),
            "encrypted_filename": encrypted_path.name,
            "config_filename":    config_path.name,
            "output_dir":         str(output_dir),
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/decode", methods=["POST"])
def decode():
    """
    Multipart form fields:
      encrypted_image — the encrypted PNG
      key_image       — original key image
      config_file     — the .config.json
      output_dir      — (optional) directory for recovered file

    Returns JSON:
      { success, recovered_path, recovered_filename, output_dir }
    """
    try:
        required = ["encrypted_image", "key_image", "config_file"]
        for r in required:
            if r not in request.files:
                return jsonify({"error": f"Missing {r}"}), 400

        enc_image   = request.files["encrypted_image"]
        key_image   = request.files["key_image"]
        config_file = request.files["config_file"]
        output_dir  = request.form.get("output_dir", "").strip()

        if not output_dir:
            output_dir = tempfile.mkdtemp(prefix="imgdec_")
        else:
            os.makedirs(output_dir, exist_ok=True)

        tmp_enc = _save_upload(enc_image,   suffix=".png")
        tmp_key = _save_upload(key_image,   suffix=Path(key_image.filename).suffix)
        tmp_cfg = _save_upload(config_file, suffix=".json")

        enc = Encryptor()
        recovered_path = enc.decode(
            encrypted_path=tmp_enc,
            key_path=tmp_key,
            config_path=tmp_cfg,
            output_dir=Path(output_dir),
        )

        tmp_enc.unlink(missing_ok=True)
        tmp_key.unlink(missing_ok=True)
        tmp_cfg.unlink(missing_ok=True)

        return jsonify({
            "success":            True,
            "recovered_path":     str(recovered_path),
            "recovered_filename": Path(recovered_path).name,
            "output_dir":         str(output_dir),
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/download", methods=["GET"])
def download():
    """Stream a file back to the browser. ?path=<absolute_path>"""
    path = request.args.get("path", "")
    if not path or not os.path.isfile(path):
        return jsonify({"error": "File not found"}), 404
    return send_file(path, as_attachment=True, download_name=os.path.basename(path))


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5050))
    print(f"\n  Image Encryptor API running at http://localhost:{port}")
    print(f"  Health check: http://localhost:{port}/health\n")
    app.run(host="0.0.0.0", port=port, debug=False)
