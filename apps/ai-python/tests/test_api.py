from unittest.mock import Mock

from fastapi.testclient import TestClient

from src.domain.models import (
    BiometricReference,
    BoundingBox,
    EnrollmentResponse,
    FaceDetection,
    MatchResponse,
)
from src.main import app, service


client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "ai-python"}


def test_detect_face_returns_extracted_embedding_metadata(monkeypatch) -> None:
    detect = Mock(
        return_value=FaceDetection(
            face_detected=True,
            quality=0.93,
            bbox=BoundingBox(x=1, y=2, width=30, height=40),
            message="Rosto detectado e embedding extraído com sucesso.",
            embedding_dimensions=512,
        )
    )
    monkeypatch.setattr(service, "detect", detect)

    response = client.post(
        "/detect-face",
        files={"file": ("face.jpg", b"image-bytes", "image/jpeg")},
    )

    assert response.status_code == 200
    assert response.json()["embedding_dimensions"] == 512
    detect.assert_called_once_with(b"image-bytes")


def test_match_accepts_three_angles(monkeypatch) -> None:
    match = Mock(
        return_value=MatchResponse(
            candidates=[],
            processing_ms=15.5,
            processed_images=3,
        )
    )
    monkeypatch.setattr(service, "match", match)
    files = [
        ("file", (f"angle-{index}.jpg", f"image-{index}".encode(), "image/jpeg"))
        for index in range(1, 4)
    ]

    response = client.post(
        "/match?limit=10&threshold=0.7",
        files=files,
    )

    assert response.status_code == 200
    assert response.json()["processed_images"] == 3
    match.assert_called_once_with(
        [b"image-1", b"image-2", b"image-3"],
        10,
        0.7,
    )


def test_match_rejects_more_than_three_angles() -> None:
    files = [
        ("file", (f"angle-{index}.jpg", b"image", "image/jpeg"))
        for index in range(4)
    ]

    response = client.post("/match", files=files)

    assert response.status_code == 422
    assert response.json()["detail"] == "Envie entre 1 e 3 fotos para a busca."


def test_upload_rejects_unsupported_media_type() -> None:
    response = client.post(
        "/detect-face",
        files={"file": ("face.gif", b"image", "image/gif")},
    )

    assert response.status_code == 415


def test_match_validates_query_parameters() -> None:
    response = client.post(
        "/match?limit=101&threshold=2",
        files={"file": ("face.jpg", b"image", "image/jpeg")},
    )

    assert response.status_code == 422


def test_enroll_requires_internal_api_key() -> None:
    response = client.post(
        "/enroll",
        data={
            "owner_type": "MISSING_PERSON",
            "owner_id": "7f444dd0-bfeb-4a14-9e2f-c751f721e13d",
        },
        files={"file": ("face.jpg", b"image", "image/jpeg")},
    )

    assert response.status_code == 401


def test_enroll_registers_images(monkeypatch) -> None:
    enroll = Mock(
        return_value=EnrollmentResponse(
            references=[
                BiometricReference(
                    biometric_record_id="bio-1",
                    owner_type="MISSING_PERSON",
                    owner_id="7f444dd0-bfeb-4a14-9e2f-c751f721e13d",
                    image_path="missing_person/owner/photo.jpg",
                    quality=0.93,
                )
            ],
            total_references=1,
        )
    )
    monkeypatch.setattr(service, "enroll", enroll)

    response = client.post(
        "/enroll",
        headers={"X-API-Key": "development-only-change-me"},
        data={
            "owner_type": "MISSING_PERSON",
            "owner_id": "7f444dd0-bfeb-4a14-9e2f-c751f721e13d",
        },
        files={"file": ("face.jpg", b"image", "image/jpeg")},
    )

    assert response.status_code == 200
    assert response.json()["total_references"] == 1
    assert response.json()["references"][0]["biometric_record_id"] == "bio-1"
