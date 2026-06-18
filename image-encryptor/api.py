"""Local REST API for Image Encryptor — run with: python image-encryptor/api.py"""
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os, tempfile, traceback
from encryptor import ImageEncryptor

app = Flask(__name__)
CORS(app)  # allow requests from file:// or localhost UI

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def _save_upload(file_storage, suffix=""):
    """Save an uploaded FileStorage to a temp file and return its path."""
    fd, path = tempfile.mkstemp(suffix=suffix)
    os.close(fd)
    file_storage.save(path)
    return path


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
      { encrypted_path, config_path, original_filename,
        encrypted_filename, config_filename }
    """
    try:
        if "input_file" not in request.files or "key_image" not in request.files:
            return jsonify({"error": "Missing input_file or key_image"}), 400

        input_file  = request.files["input_file"]
        key_image   = request.files["key_image"]
        output_dir  = request.form.get("output_dir", "").strip()

        orig_name   = input_file.filename
        stem        = os.path.splitext(orig_name)[0]

        # Resolve output directory
        if not output_dir:
            output_dir = tempfile.mkdtemp(prefix="imgenc_")
        else:
            os.makedirs(output_dir, exist_ok=True)

        # Save uploads to temp paths
        input_ext  = os.path.splitext(orig_name)[1]
        tmp_input  = _save_upload(input_file, suffix=input_ext)
        tmp_key    = _save_upload(key_image,  suffix=os.path.splitext(key_image.filename)[1])

        encrypted_path = os.path.join(output_dir, f"{stem}-encrypted.png")
        config_path    = os.path.join(output_dir, f"{stem}.config.json")

        enc = ImageEncryptor(tmp_key)
        enc.encode(tmp_input, encrypted_path, config_path)

        # Clean up temp input/key
        os.unlink(tmp_input)
        os.unlink(tmp_key)

        return jsonify({
            "success": True,
            "original_filename":  orig_name,
            "encrypted_path":     encrypted_path,
            "config_path":        config_path,
            "encrypted_filename": os.path.basename(encrypted_path),
            "config_filename":    os.path.basename(config_path),
            "output_dir":         output_dir,
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
      { recovered_path, recovered_filename, original_filename }
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
        tmp_key = _save_upload(key_image,   suffix=os.path.splitext(key_image.filename)[1])
        tmp_cfg = _save_upload(config_file, suffix=".json")

        enc = ImageEncryptor(tmp_key)
        recovered_path = enc.decode(tmp_enc, tmp_cfg, output_dir)

        os.unlink(tmp_enc)
        os.unlink(tmp_key)
        os.unlink(tmp_cfg)

        return jsonify({
            "success":           True,
            "recovered_path":    recovered_path,
            "recovered_filename": os.path.basename(recovered_path),
            "output_dir":        output_dir,
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
