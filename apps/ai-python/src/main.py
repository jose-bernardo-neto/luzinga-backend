from fastapi import FastAPI, File, HTTPException, Query, UploadFile, status

from src.adapters.insightface_engine import InsightFaceEngine
from src.domain.models import FaceDetection, MatchResponse

app = FastAPI(
    title="Luzinga AI Service",
    version="0.1.0",
    description="Detecção facial, extração de embeddings e face matching.",
)

engine = InsightFaceEngine()


@app.get("/health", tags=["Sistema"])
def health() -> dict[str, str]:
    return {"status": "ok", "service": "ai-python"}


@app.post("/detect-face", response_model=FaceDetection, tags=["Biometria"])
async def detect_face(file: UploadFile = File(...)) -> FaceDetection:
    image_bytes = await file.read()

    try:
        return engine.detect(image_bytes)
    except NotImplementedError as exc:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail=str(exc),
        ) from exc


@app.post("/match", response_model=MatchResponse, tags=["Biometria"])
async def match(
    file: UploadFile = File(...),
    limit: int = Query(20, ge=1, le=100),
    threshold: float = Query(0.5, ge=0, le=1),
) -> MatchResponse:
    image_bytes = await file.read()

    try:
        candidates = engine.match(image_bytes, limit=limit, threshold=threshold)
    except NotImplementedError as exc:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail=str(exc),
        ) from exc

    return MatchResponse(candidates=candidates, processing_ms=0)
