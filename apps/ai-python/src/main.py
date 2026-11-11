from secrets import compare_digest
from typing import Annotated

from fastapi import FastAPI, File, Form, Header, HTTPException, Query, UploadFile, status
from starlette.concurrency import run_in_threadpool

from src.adapters.insightface_engine import InsightFaceEngine
from src.adapters.local_biometric_storage import LocalBiometricStorage
from src.adapters.pgvector_biometric_repository import PgVectorBiometricRepository
from src.application.face_recognition import EnrollmentImage, FaceRecognitionService
from src.config import get_settings
from src.domain.errors import (
    BiometricRepositoryError,
    BiometricOwnerNotFoundError,
    BiometricReferenceLimitError,
    BiometricStorageError,
    FaceEngineUnavailableError,
    InvalidImageError,
    MultipleFacesDetectedError,
    NoFaceDetectedError,
)
from src.domain.models import EnrollmentResponse, FaceDetection, MatchResponse

MAX_IMAGE_BYTES = 10 * 1024 * 1024
MAX_SEARCH_IMAGES = 3
ACCEPTED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}

settings = get_settings()
engine = InsightFaceEngine(
    model_name=settings.face_model_name,
    detection_size=settings.face_detection_size,
)
repository = PgVectorBiometricRepository(settings.database_url)
storage = LocalBiometricStorage(settings.biometric_media_root)
service = FaceRecognitionService(engine, repository, storage)

app = FastAPI(
    title="Luzinga AI Service",
    version="0.2.0",
    description="Detecção facial, extração de embeddings e face matching multiângulo.",
)


async def read_image(file: UploadFile) -> bytes:
    if file.content_type not in ACCEPTED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Formato não suportado. Envie JPEG, PNG ou WEBP.",
        )

    content = await file.read(MAX_IMAGE_BYTES + 1)

    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O arquivo de imagem está vazio.",
        )

    if len(content) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Cada imagem deve ter no máximo 10 MiB.",
        )

    return content


def translate_face_error(exc: Exception) -> HTTPException:
    if isinstance(exc, InvalidImageError):
        return HTTPException(status_code=400, detail=str(exc))
    if isinstance(exc, (NoFaceDetectedError, MultipleFacesDetectedError)):
        return HTTPException(status_code=422, detail=str(exc))
    if isinstance(exc, BiometricReferenceLimitError):
        return HTTPException(status_code=409, detail=str(exc))
    if isinstance(exc, BiometricOwnerNotFoundError):
        return HTTPException(status_code=404, detail=str(exc))
    if isinstance(
        exc,
        (FaceEngineUnavailableError, BiometricRepositoryError, BiometricStorageError),
    ):
        return HTTPException(status_code=503, detail=str(exc))
    return HTTPException(status_code=500, detail="Erro interno no serviço biométrico.")


@app.get("/health", tags=["Sistema"])
def health() -> dict[str, str]:
    return {"status": "ok", "service": "ai-python"}


@app.post("/detect-face", response_model=FaceDetection, tags=["Biometria"])
async def detect_face(file: UploadFile = File(...)) -> FaceDetection:
    image_bytes = await read_image(file)

    try:
        return await run_in_threadpool(service.detect, image_bytes)
    except Exception as exc:
        raise translate_face_error(exc) from exc


@app.post("/match", response_model=MatchResponse, tags=["Biometria"])
async def match(
    files: Annotated[list[UploadFile], File(alias="file")],
    limit: int = Query(20, ge=1, le=100),
    threshold: float = Query(0.5, ge=0, le=1),
) -> MatchResponse:
    if not 1 <= len(files) <= MAX_SEARCH_IMAGES:
        raise HTTPException(
            status_code=422,
            detail="Envie entre 1 e 3 fotos para a busca.",
        )

    images = [await read_image(file) for file in files]

    try:
        return await run_in_threadpool(
            service.match,
            images,
            limit,
            threshold,
        )
    except Exception as exc:
        raise translate_face_error(exc) from exc


@app.post("/enroll", response_model=EnrollmentResponse, tags=["Biometria"])
async def enroll(
    files: Annotated[list[UploadFile], File(alias="file")],
    owner_type: Annotated[str, Form(pattern="^(MISSING_PERSON|SHELTERED_PERSON)$")],
    owner_id: Annotated[str, Form(pattern="^[0-9a-fA-F-]{36}$")],
    x_api_key: Annotated[str | None, Header()] = None,
) -> EnrollmentResponse:
    if x_api_key is None or not compare_digest(
        x_api_key,
        settings.ai_service_api_key,
    ):
        raise HTTPException(status_code=401, detail="Credencial interna inválida.")

    if not 1 <= len(files) <= MAX_SEARCH_IMAGES:
        raise HTTPException(
            status_code=422,
            detail="Envie entre 1 e 3 fotos para o cadastro biométrico.",
        )

    images = [
        EnrollmentImage(
            content=await read_image(file),
            content_type=file.content_type or "",
        )
        for file in files
    ]

    try:
        return await run_in_threadpool(
            service.enroll,
            owner_type,
            owner_id,
            images,
            MAX_SEARCH_IMAGES,
        )
    except Exception as exc:
        raise translate_face_error(exc) from exc
