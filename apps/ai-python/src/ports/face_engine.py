from typing import Protocol

from src.domain.models import ExtractedFace


class FaceEngine(Protocol):
    """Porta de saída para o motor de visão computacional."""

    def extract(self, image_bytes: bytes) -> ExtractedFace: ...
