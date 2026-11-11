from fastapi.testclient import TestClient

from src.main import app


client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "ai-python"}


def test_detect_face_reports_not_implemented() -> None:
    response = client.post(
        "/detect-face",
        files={"file": ("face.jpg", b"fake-image", "image/jpeg")},
    )

    assert response.status_code == 501
    assert "ainda não implementado" in response.json()["detail"]


def test_match_reports_not_implemented() -> None:
    response = client.post(
        "/match?limit=10&threshold=0.7",
        files={"file": ("face.jpg", b"fake-image", "image/jpeg")},
    )

    assert response.status_code == 501
    assert "ainda não implementado" in response.json()["detail"]


def test_match_validates_query_parameters() -> None:
    response = client.post(
        "/match?limit=101&threshold=2",
        files={"file": ("face.jpg", b"fake-image", "image/jpeg")},
    )

    assert response.status_code == 422
