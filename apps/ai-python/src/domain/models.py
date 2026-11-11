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


class MatchCandidate(BaseModel):
    biometric_record_id: str
    owner_type: str
    owner_id: str
    similarity: float = Field(ge=0, le=1)
    image_path: str | None = None


class MatchResponse(BaseModel):
    candidates: list[MatchCandidate]
    processing_ms: float
