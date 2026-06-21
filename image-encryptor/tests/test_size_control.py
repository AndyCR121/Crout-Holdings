from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

import pytest
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from encryptor import CapacityError, Encryptor, UnsupportedCarrierError
from key_manager import KeyManager
from pixel_mapper import PixelMapper


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def test_detects_actual_format_for_mislabeled_jpeg() -> None:
    key_path = ROOT / "test_files" / "key.png"

    assert KeyManager(key_path).format() == "JPEG"


def test_jpeg_strict_reports_dct_capacity_not_rgb(tmp_path: Path) -> None:
    key_path = ROOT / "test_files" / "key.png"
    payload = ROOT / "test_files" / "small_test.png"

    with pytest.raises(UnsupportedCarrierError) as exc_info:
        Encryptor().encode(
            input_path=payload,
            key_path=key_path,
            output_path=tmp_path / "small_test-encrypted.jpg",
            config_path=tmp_path / "small_test.config.json",
        )

    details = exc_info.value.to_dict()
    assert details["carrier_format"] == "JPEG"
    assert details["encoding_strategy"] == "jpeg-dct-strict-unavailable"
    assert details["capacity_bytes"] == 0
    assert details["capacity_bytes"] != PixelMapper.capacity_bytes(6000 * 4000)


def test_bmp_roundtrip_preserves_bytes_and_size_budget(tmp_path: Path) -> None:
    key_path = tmp_path / "carrier.bmp"
    payload = tmp_path / "payload.csv"
    output = tmp_path / "payload-encrypted.bmp"
    config_path = tmp_path / "payload.config.json"
    decoded_dir = tmp_path / "decoded"

    Image.new("RGB", (160, 160), color=(80, 120, 160)).save(key_path, format="BMP")
    payload.write_text("name,value\ncrout,42\n")

    Encryptor().encode(
        input_path=payload,
        key_path=key_path,
        output_path=output,
        config_path=config_path,
    )
    recovered = Encryptor().decode(
        encrypted_path=output,
        key_path=key_path,
        config_path=config_path,
        output_dir=decoded_dir,
    )

    cfg = json.loads(config_path.read_text())
    assert cfg["version"] == 4
    assert cfg["carrier_format"] == "BMP"
    assert cfg["output_format"] == "BMP"
    assert cfg["encoding_strategy"] == "bmp-fixed-lsb"
    assert abs(cfg["size_delta_pct"]) <= 1.0
    assert output.suffix == ".bmp"
    assert _sha256(recovered) == _sha256(payload)


def test_bmp_capacity_failure_is_structured(tmp_path: Path) -> None:
    key_path = tmp_path / "small-carrier.bmp"
    payload = tmp_path / "too-large.csv"

    Image.new("RGB", (20, 20), color=(10, 20, 30)).save(key_path, format="BMP")
    payload.write_bytes(b"x" * 2_000)

    with pytest.raises(CapacityError) as exc_info:
        Encryptor().encode(
            input_path=payload,
            key_path=key_path,
            output_path=tmp_path / "too-large-encrypted.bmp",
            config_path=tmp_path / "too-large.config.json",
        )

    details = exc_info.value.to_dict()
    assert details["code"] == "capacity_exceeded"
    assert details["carrier_format"] == "BMP"
    assert details["capacity_bytes"] < details["payload_bytes"]


def test_pixel_mapper_roundtrips_one_bit_mode() -> None:
    mapper = PixelMapper(bits_per_channel=1)
    data = b"one-bit fallback"
    pixels = [(100, 120, 140)] * mapper.capacity_pixels(len(data), 1)

    encoded = mapper.embed(data, pixels)

    assert mapper.extract(encoded, len(data)) == data
