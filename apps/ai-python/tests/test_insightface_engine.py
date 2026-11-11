from types import SimpleNamespace

import cv2
import numpy as np
import pytest

from src.adapters.insightface_engine import InsightFaceEngine
from src.domain.errors import MultipleFacesDetectedError, NoFaceDetectedError


def encoded_image() -> bytes:
    ok, content = cv2.imencode(".png", np.zeros((32, 32, 3), dtype=np.uint8))
    assert ok
    return content.tobytes()


def fake_face() -> SimpleNamespace:
    return SimpleNamespace(
        normed_embedding=np.full(512, 1 / np.sqrt(512), dtype=np.float32),
        bbox=np.array([1.2, 2.4, 20.8, 30.1]),
        det_score=0.93,
    )


class FakeFaceAnalysis:
    def __init__(self, faces) -> None:
        self._faces = faces

    def get(self, _image):
        return self._faces


def engine_with_faces(faces) -> InsightFaceEngine:
    engine = InsightFaceEngine()
    engine._app = FakeFaceAnalysis(faces)
    return engine


def test_extract_returns_normalized_512_dimension_embedding() -> None:
    result = engine_with_faces([fake_face()]).extract(encoded_image())

    assert len(result.embedding) == 512
    assert np.linalg.norm(result.embedding) == pytest.approx(1.0)
    assert result.quality == pytest.approx(0.93)
    assert result.bbox.width > 0
    assert result.bbox.height > 0


def test_extract_rejects_image_without_face() -> None:
    with pytest.raises(NoFaceDetectedError):
        engine_with_faces([]).extract(encoded_image())


def test_extract_rejects_image_with_multiple_faces() -> None:
    with pytest.raises(MultipleFacesDetectedError):
        engine_with_faces([fake_face(), fake_face()]).extract(encoded_image())
