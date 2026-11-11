from dataclasses import dataclass
from time import perf_counter
from uuid import uuid4

from src.domain.errors import NoFaceDetectedError
from src.domain.models import (
    BiometricReference,
    EnrollmentResponse,
    FaceDetection,
    MatchResponse,
    NewBiometricReference,
)
from src.ports.biometric_repository import BiometricRepository
from src.ports.biometric_storage import BiometricStorage
from src.ports.face_engine import FaceEngine


@dataclass(frozen=True)
class EnrollmentImage:
    content: bytes
    content_type: str


class FaceRecognitionService:
    def __init__(
        self,
        engine: FaceEngine,
        repository: BiometricRepository,
        storage: BiometricStorage,
    ) -> None:
        self._engine = engine
        self._repository = repository
        self._storage = storage

    def detect(self, image_bytes: bytes) -> FaceDetection:
        try:
            face = self._engine.extract(image_bytes)
        except NoFaceDetectedError:
            return FaceDetection(
                face_detected=False,
                message="Não contém rosto na foto.",
            )

        return FaceDetection(
            face_detected=True,
            quality=face.quality,
            bbox=face.bbox,
            message="Rosto detectado e embedding extraído com sucesso.",
            embedding_dimensions=len(face.embedding),
        )

    def match(
        self,
        images: list[bytes],
        limit: int,
        threshold: float,
    ) -> MatchResponse:
        started_at = perf_counter()
        embeddings: list[tuple[float, ...]] = []

        for index, image_bytes in enumerate(images, start=1):
            try:
                face = self._engine.extract(image_bytes)
            except NoFaceDetectedError as exc:
                raise NoFaceDetectedError(
                    f"A foto {index} não contém um rosto detectável."
                ) from exc

            embeddings.append(face.embedding)

        candidates = self._repository.find_matches(
            embeddings,
            limit=limit,
            threshold=threshold,
        )

        return MatchResponse(
            candidates=candidates,
            processing_ms=round((perf_counter() - started_at) * 1000, 2),
            processed_images=len(images),
        )

    def enroll(
        self,
        owner_type: str,
        owner_id: str,
        images: list[EnrollmentImage],
        maximum_per_owner: int = 3,
    ) -> EnrollmentResponse:
        references: list[NewBiometricReference] = []

        try:
            for index, image in enumerate(images, start=1):
                try:
                    face = self._engine.extract(image.content)
                except NoFaceDetectedError as exc:
                    raise NoFaceDetectedError(
                        f"A foto {index} não contém um rosto detectável."
                    ) from exc

                image_path = self._storage.save(
                    owner_type,
                    owner_id,
                    image.content,
                    image.content_type,
                )
                references.append(
                    NewBiometricReference(
                        id=str(uuid4()),
                        owner_type=owner_type,
                        owner_id=owner_id,
                        image_path=image_path,
                        embedding=face.embedding,
                        quality=face.quality,
                    )
                )

            total = self._repository.add_references(
                references,
                maximum_per_owner=maximum_per_owner,
            )
        except Exception:
            for reference in references:
                self._storage.delete(reference.image_path)
            raise

        return EnrollmentResponse(
            references=[
                BiometricReference(
                    biometric_record_id=reference.id,
                    owner_type=reference.owner_type,
                    owner_id=reference.owner_id,
                    image_path=reference.image_path,
                    quality=reference.quality,
                )
                for reference in references
            ],
            total_references=total,
        )
