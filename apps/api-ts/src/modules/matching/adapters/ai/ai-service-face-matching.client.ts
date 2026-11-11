import type {
  FaceDetectionResult,
  FaceImage,
  FaceMatchOptions,
  FaceMatchResult,
} from "@/modules/matching/domain/face-matching";
import type { FaceMatchingPort } from "@/modules/matching/ports/face-matching.port";
import { env } from "@/shared/config/env";
import { ServiceUnavailableError } from "@/shared/errors/app-error";

interface AiDetectionPayload {
  face_detected: boolean;
  quality?: number | null;
  message?: string | null;
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
}

export class AiServiceFaceMatchingClient implements FaceMatchingPort {
  async detect(image: FaceImage): Promise<FaceDetectionResult> {
    const response = await this.post("/detect-face", image);
    const payload = (await response.json()) as AiDetectionPayload;

    return {
      faceDetected: payload.face_detected,
      quality: payload.quality ?? null,
      message: payload.message ?? null,
    };
  }

  async match(
    image: FaceImage,
    options: FaceMatchOptions,
  ): Promise<FaceMatchResult> {
    const response = await this.post("/match", image, {
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
    };
  }

  private async post(
    path: string,
    image: FaceImage,
    query: Record<string, string> = {},
  ): Promise<Response> {
    const form = new FormData();
    form.append(
      "file",
      new Blob([image.buffer], { type: image.mimeType }),
      image.filename,
    );

    const url = new URL(path, env.AI_SERVICE_URL);

    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        body: form,
        signal: AbortSignal.timeout(env.AI_SERVICE_TIMEOUT_MS),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");

        throw new ServiceUnavailableError(
          "O serviço de reconhecimento facial retornou um erro.",
          {
            status: response.status,
            detail: detail.slice(0, 500),
          },
        );
      }

      return response;
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
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
