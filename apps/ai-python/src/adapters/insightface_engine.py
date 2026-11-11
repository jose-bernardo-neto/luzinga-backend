from src.domain.models import FaceDetection, MatchCandidate


class InsightFaceEngine:
    """Adapter previsto para OpenCV/InsightFace + pgvector.

    O pipeline real ainda não foi implementado. Os métodos levantam
    NotImplementedError para que a API responda 501 sem mascarar o estado
    inacabado do serviço.
    """

    def detect(self, image_bytes: bytes) -> FaceDetection:
        raise NotImplementedError(
            "Pipeline de detecção facial ainda não implementado."
        )

    def match(
        self,
        image_bytes: bytes,
        limit: int,
        threshold: float,
    ) -> list[MatchCandidate]:
        raise NotImplementedError(
            "Pipeline de face matching ainda não implementado."
        )
