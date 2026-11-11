from typing import Protocol

from src.domain.models import FaceDetection, MatchCandidate


class FaceEngine(Protocol):
    """Porta de saída para o motor de visão computacional."""

    def detect(self, image_bytes: bytes) -> FaceDetection: ...

    def match(
        self,
        image_bytes: bytes,
        limit: int,
        threshold: float,
    ) -> list[MatchCandidate]: ...
