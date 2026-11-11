import type {
  BiometricEnrollmentResult,
  FaceDetectionResult,
  FaceImage,
  FaceMatchOptions,
  FaceMatchResult,
} from "@/modules/matching/domain/face-matching";
import type { FaceMatchingPort } from "@/modules/matching/ports/face-matching.port";
import { env } from "@/shared/config/env";
import {
  AppError,
  BadRequestError,
  ConflictError,
  NotFoundError,
  ServiceUnavailableError,
  UnprocessableEntityError,
} from "@/shared/errors/app-error";

interface AiDetectionPayload {
  face_detected: boolean;
  quality?: number | null;
  message?: string | null;
  embedding_dimensions?: number | null;
}

interface AiMatchCandidatePayload {
  biometric_record_id: string;
  owner_type: "MISSING_PERSON" | "SHELTERED_PERSON";
  owner_id: string;
  similarity: number;
  image_path?: string | null;
}

interface AiMatchPayload {
  candidates: AiMatchCandidatePayload[];
  processing_ms?: number;
  processed_images: number;
}

interface AiEnrollmentPayload {
  references: Array<{
    biometric_record_id: string;
    owner_type: "MISSING_PERSON" | "SHELTERED_PERSON";
    owner_id: string;
    image_path: string;
    quality: number;
  }>;
  total_references: number;
}

export class AiServiceFaceMatchingClient implements FaceMatchingPort {
  async detect(image: FaceImage): Promise<FaceDetectionResult> {
    const response = await this.post("/detect-face", image);
    const payload = (await response.json()) as AiDetectionPayload;

    return {
      faceDetected: payload.face_detected,
      quality: payload.quality ?? null,
      message: payload.message ?? null,
      embeddingDimensions: payload.embedding_dimensions ?? null,
    };
  }

  async match(
    images: FaceImage[],
    options: FaceMatchOptions,
  ): Promise<FaceMatchResult> {
    const response = await this.post("/match", images, {
      limit: String(options.limit),
      threshold: String(options.threshold),
    });
    const payload = (await response.json()) as AiMatchPayload;

    return {
      candidates: payload.candidates.map((candidate) => ({
        biometricRecordId: candidate.biometric_record_id,
        ownerType: candidate.owner_type,
        ownerId: candidate.owner_id,
        similarity: candidate.similarity,
        imagePath: candidate.image_path ?? null,
      })),
      processingMs: payload.processing_ms ?? 0,
      processedImages: payload.processed_images,
    };
  }

  async enroll(
    images: FaceImage[],
    ownerType: "MISSING_PERSON" | "SHELTERED_PERSON",
    ownerId: string,
  ): Promise<BiometricEnrollmentResult> {
    const response = await this.post(
      "/enroll",
      images,
      {},
      {
        owner_type: ownerType,
        owner_id: ownerId,
      },
      { "X-API-Key": env.AI_SERVICE_API_KEY },
    );
    const payload = (await response.json()) as AiEnrollmentPayload;

    return {
      references: payload.references.map((reference) => ({
        biometricRecordId: reference.biometric_record_id,
        ownerType: reference.owner_type,
        ownerId: reference.owner_id,
        imagePath: reference.image_path,
        quality: reference.quality,
      })),
      totalReferences: payload.total_references,
    };
  }

  private async post(
    path: string,
    images: FaceImage | FaceImage[],
    query: Record<string, string> = {},
    fields: Record<string, string> = {},
    headers: Record<string, string> = {},
  ): Promise<Response> {
    const form = new FormData();
    for (const image of Array.isArray(images) ? images : [images]) {
      form.append(
        "file",
        new Blob([image.buffer], { type: image.mimeType }),
        image.filename,
      );
    }

    for (const [key, value] of Object.entries(fields)) {
      form.append(key, value);
    }

    const url = new URL(path, env.AI_SERVICE_URL);

    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        body: form,
        headers,
        signal: AbortSignal.timeout(env.AI_SERVICE_TIMEOUT_MS),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        const remoteDetails = {
          status: response.status,
          detail: detail.slice(0, 500),
        };

        if (response.status === 422) {
          throw new UnprocessableEntityError(
            "Uma ou mais fotos não são adequadas para reconhecimento facial.",
            remoteDetails,
          );
        }

        if ([400, 413, 415].includes(response.status)) {
          throw new BadRequestError(
            "Uma ou mais imagens enviadas são inválidas.",
            remoteDetails,
          );
        }

        if (response.status === 404) {
          throw new NotFoundError("Proprietário biométrico não encontrado.");
        }

        if (response.status === 409) {
          throw new ConflictError(
            "O limite de três referências biométricas foi atingido.",
          );
        }

        throw new ServiceUnavailableError(
          "O serviço de reconhecimento facial retornou um erro.",
          remoteDetails,
        );
      }

      return response;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new ServiceUnavailableError(
        "Não foi possível comunicar com o serviço de reconhecimento facial.",
        {
          cause: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }
}
