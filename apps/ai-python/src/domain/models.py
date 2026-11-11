from dataclasses import dataclass

from pydantic import BaseModel, Field


class BoundingBox(BaseModel):
    x: int
    y: int
    width: int
    height: int


class FaceDetection(BaseModel):
    face_detected: bool
    quality: float | None = None
    bbox: BoundingBox | None = None
    message: str | None = None
    embedding_dimensions: int | None = None


class MatchCandidate(BaseModel):
    biometric_record_id: str
    owner_type: str
    owner_id: str
    similarity: float = Field(ge=0, le=1)
    image_path: str | None = None


class MatchResponse(BaseModel):
    candidates: list[MatchCandidate]
    processing_ms: float
    processed_images: int


class BiometricReference(BaseModel):
    biometric_record_id: str
    owner_type: str
    owner_id: str
    image_path: str
    quality: float = Field(ge=0, le=1)


class EnrollmentResponse(BaseModel):
    references: list[BiometricReference]
    total_references: int


@dataclass(frozen=True)
class ExtractedFace:
    """Resultado interno; o embedding biométrico não é exposto pela API HTTP."""

    embedding: tuple[float, ...]
    bbox: BoundingBox
    quality: float


@dataclass(frozen=True)
class NewBiometricReference:
    id: str
    owner_type: str
    owner_id: str
    image_path: str
    embedding: tuple[float, ...]
    quality: float
