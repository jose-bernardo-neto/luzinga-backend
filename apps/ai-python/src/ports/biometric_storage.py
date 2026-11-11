from typing import Protocol


class BiometricStorage(Protocol):
    def save(
        self,
        owner_type: str,
        owner_id: str,
        content: bytes,
        content_type: str,
    ) -> str: ...

    def delete(self, image_path: str) -> None: ...
