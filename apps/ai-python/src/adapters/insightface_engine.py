from threading import Lock
from typing import Any

import numpy as np

from src.domain.errors import (
    FaceEngineUnavailableError,
    InvalidImageError,
    MultipleFacesDetectedError,
    NoFaceDetectedError,
)
from src.domain.models import BoundingBox, ExtractedFace


class InsightFaceEngine:
    """Detecção e extração com InsightFace buffalo_l em CPU."""

    def __init__(self, model_name: str = "buffalo_l", detection_size: int = 640) -> None:
        self._model_name = model_name
        self._detection_size = detection_size
        self._app: Any | None = None
        self._initialization_lock = Lock()

    def _get_app(self) -> Any:
        if self._app is not None:
            return self._app

        with self._initialization_lock:
            if self._app is not None:
                return self._app

            try:
                from insightface.app import FaceAnalysis

                app = FaceAnalysis(
                    name=self._model_name,
                    providers=["CPUExecutionProvider"],
                )
                app.prepare(
                    ctx_id=-1,
                    det_size=(self._detection_size, self._detection_size),
                )
            except Exception as exc:
                raise FaceEngineUnavailableError(
                    "Não foi possível inicializar o modelo de reconhecimento facial."
                ) from exc

            self._app = app
            return app

    def extract(self, image_bytes: bytes) -> ExtractedFace:
        if not image_bytes:
            raise InvalidImageError("O arquivo de imagem está vazio.")

        try:
            import cv2

            encoded = np.frombuffer(image_bytes, dtype=np.uint8)
            image = cv2.imdecode(encoded, cv2.IMREAD_COLOR)
        except Exception as exc:
            raise InvalidImageError("Não foi possível decodificar a imagem.") from exc

        if image is None or image.size == 0:
            raise InvalidImageError("Arquivo inválido ou imagem corrompida.")

        try:
            faces = self._get_app().get(image)
        except FaceEngineUnavailableError:
            raise
        except Exception as exc:
            raise FaceEngineUnavailableError(
                "O motor facial falhou ao processar a imagem."
            ) from exc

        if len(faces) == 0:
            raise NoFaceDetectedError("Não contém rosto na foto.")

        if len(faces) > 1:
            raise MultipleFacesDetectedError(
                "A foto deve conter exatamente um rosto."
            )

        face = faces[0]
        embedding = np.asarray(face.normed_embedding, dtype=np.float32)

        if embedding.shape != (512,) or not np.isfinite(embedding).all():
            raise FaceEngineUnavailableError(
                "O modelo retornou um embedding facial inválido."
            )

        x1, y1, x2, y2 = (int(round(value)) for value in face.bbox)

        return ExtractedFace(
            embedding=tuple(float(value) for value in embedding),
            bbox=BoundingBox(
                x=max(x1, 0),
                y=max(y1, 0),
                width=max(x2 - x1, 0),
                height=max(y2 - y1, 0),
            ),
            quality=float(np.clip(face.det_score, 0, 1)),
        )
