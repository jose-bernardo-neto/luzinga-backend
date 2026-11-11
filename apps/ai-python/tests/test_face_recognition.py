from src.application.face_recognition import EnrollmentImage, FaceRecognitionService
from src.domain.errors import NoFaceDetectedError
from src.domain.models import BoundingBox, ExtractedFace, MatchCandidate


class FakeEngine:
    def __init__(self) -> None:
        self.images: list[bytes] = []

    def extract(self, image_bytes: bytes) -> ExtractedFace:
        self.images.append(image_bytes)
        if image_bytes == b"without-face":
            raise NoFaceDetectedError("sem rosto")
        return ExtractedFace(
            embedding=tuple([0.1] * 512),
            bbox=BoundingBox(x=1, y=2, width=3, height=4),
            quality=0.95,
        )


class FakeRepository:
    def __init__(self) -> None:
        self.embeddings: list[tuple[float, ...]] = []

    def find_matches(self, embeddings, limit, threshold):
        self.embeddings = embeddings
        return [
            MatchCandidate(
                biometric_record_id="bio-1",
                owner_type="MISSING_PERSON",
                owner_id="person-1",
                similarity=0.88,
            )
        ]

    def add_references(self, references, maximum_per_owner):
        self.added_references = references
        return len(references)


class FailingRepository(FakeRepository):
    def add_references(self, references, maximum_per_owner):
        raise RuntimeError("database failure")


class FakeStorage:
    def __init__(self) -> None:
        self.saved: list[str] = []
        self.deleted: list[str] = []

    def save(self, owner_type, owner_id, content, content_type):
        path = f"{owner_type.lower()}/{owner_id}/{len(self.saved)}.jpg"
        self.saved.append(path)
        return path

    def delete(self, image_path):
        self.deleted.append(image_path)


def build_service(engine=None, repository=None, storage=None):
    return FaceRecognitionService(
        engine or FakeEngine(),
        repository or FakeRepository(),
        storage or FakeStorage(),
    )


def test_detect_extracts_a_512_dimension_embedding_without_exposing_it() -> None:
    service = build_service()

    result = service.detect(b"face")

    assert result.face_detected is True
    assert result.embedding_dimensions == 512
    assert not hasattr(result, "embedding")


def test_detect_reports_when_image_has_no_face() -> None:
    service = build_service()

    result = service.detect(b"without-face")

    assert result.face_detected is False
    assert result.embedding_dimensions is None


def test_match_extracts_one_embedding_per_angle() -> None:
    engine = FakeEngine()
    repository = FakeRepository()
    service = build_service(engine=engine, repository=repository)

    result = service.match([b"front", b"left", b"right"], limit=5, threshold=0.7)

    assert engine.images == [b"front", b"left", b"right"]
    assert len(repository.embeddings) == 3
    assert result.processed_images == 3
    assert result.candidates[0].similarity == 0.88


def test_match_identifies_the_angle_without_face() -> None:
    service = build_service()

    try:
        service.match([b"front", b"without-face"], limit=5, threshold=0.7)
    except NoFaceDetectedError as exc:
        assert "foto 2" in str(exc)
    else:
        raise AssertionError("NoFaceDetectedError era esperado")


def test_enroll_extracts_stores_and_persists_each_reference() -> None:
    repository = FakeRepository()
    storage = FakeStorage()
    service = build_service(repository=repository, storage=storage)
    owner_id = "7f444dd0-bfeb-4a14-9e2f-c751f721e13d"

    result = service.enroll(
        "MISSING_PERSON",
        owner_id,
        [
            EnrollmentImage(content=b"front", content_type="image/jpeg"),
            EnrollmentImage(content=b"profile", content_type="image/jpeg"),
        ],
    )

    assert result.total_references == 2
    assert len(result.references) == 2
    assert len(repository.added_references) == 2
    assert len(storage.saved) == 2


def test_enroll_removes_new_files_when_persistence_fails() -> None:
    storage = FakeStorage()
    service = build_service(repository=FailingRepository(), storage=storage)

    try:
        service.enroll(
            "MISSING_PERSON",
            "7f444dd0-bfeb-4a14-9e2f-c751f721e13d",
            [EnrollmentImage(content=b"front", content_type="image/jpeg")],
        )
    except RuntimeError:
        pass
    else:
        raise AssertionError("RuntimeError era esperado")

    assert storage.deleted == storage.saved
