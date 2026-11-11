from pathlib import Path
from uuid import UUID, uuid4

from src.domain.errors import BiometricStorageError


CONTENT_TYPE_EXTENSIONS = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


class LocalBiometricStorage:
    def __init__(self, root: str | Path) -> None:
        self._root = Path(root).expanduser().resolve()

    def save(
        self,
        owner_type: str,
        owner_id: str,
        content: bytes,
        content_type: str,
    ) -> str:
        extension = CONTENT_TYPE_EXTENSIONS.get(content_type)
        if extension is None:
            raise BiometricStorageError("Formato de imagem não suportado.")

        destination: Path | None = None
        try:
            safe_owner_id = str(UUID(owner_id))
            owner_directory = self._root / owner_type.lower() / safe_owner_id
            owner_directory.mkdir(mode=0o700, parents=True, exist_ok=True)
            destination = owner_directory / f"{uuid4()}{extension}"
            destination.write_bytes(content)
            destination.chmod(0o600)
            return destination.relative_to(self._root).as_posix()
        except (OSError, ValueError) as exc:
            if destination is not None:
                destination.unlink(missing_ok=True)
            raise BiometricStorageError(
                "Não foi possível armazenar a imagem biométrica."
            ) from exc

    def delete(self, image_path: str) -> None:
        try:
            target = (self._root / image_path).resolve()
            target.relative_to(self._root)
            target.unlink(missing_ok=True)
        except (OSError, ValueError) as exc:
            raise BiometricStorageError(
                "Não foi possível remover a imagem biométrica."
            ) from exc
