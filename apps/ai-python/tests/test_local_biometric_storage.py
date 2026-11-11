from pathlib import Path

from src.adapters.local_biometric_storage import LocalBiometricStorage


def test_storage_saves_with_restricted_permissions_and_deletes(tmp_path: Path) -> None:
    storage = LocalBiometricStorage(tmp_path)
    path = storage.save(
        "MISSING_PERSON",
        "7f444dd0-bfeb-4a14-9e2f-c751f721e13d",
        b"image",
        "image/jpeg",
    )
    saved = tmp_path / path

    assert saved.read_bytes() == b"image"
    assert saved.stat().st_mode & 0o777 == 0o600

    storage.delete(path)
    assert not saved.exists()
