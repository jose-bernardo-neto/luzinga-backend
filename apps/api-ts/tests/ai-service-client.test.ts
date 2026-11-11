import { afterEach, describe, expect, mock, test } from "bun:test";
import { AiServiceFaceMatchingClient } from "@/modules/matching/adapters/ai/ai-service-face-matching.client";
import type { FaceImage } from "@/modules/matching/domain/face-matching";

const originalFetch = globalThis.fetch;
const image: FaceImage = {
  buffer: Buffer.from("image"),
  mimeType: "image/jpeg",
  filename: "face.jpg",
};

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("cliente do serviço de IA", () => {
  test("converte a resposta de detecção para o contrato TypeScript", async () => {
    const fetchMock = mock(async () => Response.json({
      face_detected: true,
      quality: 0.87,
      message: "ok",
      embedding_dimensions: 512,
    }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    expect(await new AiServiceFaceMatchingClient().detect(image)).toEqual({
      faceDetected: true,
      quality: 0.87,
      message: "ok",
      embeddingDimensions: 512,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("envia opções de comparação na query e converte candidatos", async () => {
    let requestedUrl = "";
    let requestBody: unknown;
    globalThis.fetch = mock(async (input: string | URL | Request, init?: RequestInit) => {
      requestedUrl = String(input);
      requestBody = init?.body;
      return Response.json({
        candidates: [{
          biometric_record_id: "bio-1",
          owner_type: "MISSING_PERSON",
          owner_id: "person-1",
          similarity: 0.91,
        }],
        processing_ms: 12,
        processed_images: 2,
      });
    }) as unknown as typeof fetch;

    const result = await new AiServiceFaceMatchingClient().match([image, image], {
      limit: 5,
      threshold: 0.8,
    });

    const url = new URL(requestedUrl);
    expect(url.pathname).toBe("/match");
    expect(url.searchParams.get("limit")).toBe("5");
    expect(url.searchParams.get("threshold")).toBe("0.8");
    expect(requestBody).toBeInstanceOf(FormData);
    expect((requestBody as FormData).getAll("file")).toHaveLength(2);
    expect(result).toEqual({
      candidates: [{
        biometricRecordId: "bio-1",
        ownerType: "MISSING_PERSON",
        ownerId: "person-1",
        similarity: 0.91,
        imagePath: null,
        displayName: null,
        context: null,
      }],
      processingMs: 12,
      processedImages: 2,
    });
  });

  test("preserva erro de validação facial retornado pelo serviço", async () => {
    globalThis.fetch = mock(async () => Response.json(
      { detail: "A foto deve conter exatamente um rosto." },
      { status: 422 },
    )) as unknown as typeof fetch;

    expect(new AiServiceFaceMatchingClient().match([image], {
      limit: 5,
      threshold: 0.8,
    })).rejects.toMatchObject({
      statusCode: 422,
      code: "VALIDATION_ERROR",
    });
  });

  test("preserva conflito de limite retornado pelo serviço", async () => {
    globalThis.fetch = mock(async () => Response.json(
      { detail: "Limite atingido." },
      { status: 409 },
    )) as unknown as typeof fetch;

    expect(new AiServiceFaceMatchingClient().enroll(
      [image],
      "MISSING_PERSON",
      "person-1",
    )).rejects.toMatchObject({
      statusCode: 409,
      code: "CONFLICT",
    });
  });

  test("envia cadastro biométrico com credencial interna e proprietário", async () => {
    let requestBody: FormData | undefined;
    let requestHeaders: Headers | undefined;
    globalThis.fetch = mock(async (_input: string | URL | Request, init?: RequestInit) => {
      requestBody = init?.body as FormData;
      requestHeaders = new Headers(init?.headers);
      return Response.json({
        references: [{
          biometric_record_id: "bio-1",
          owner_type: "MISSING_PERSON",
          owner_id: "person-1",
          image_path: "missing_person/person-1/photo.jpg",
          quality: 0.94,
        }],
        total_references: 1,
      });
    }) as unknown as typeof fetch;

    const result = await new AiServiceFaceMatchingClient().enroll(
      [image],
      "MISSING_PERSON",
      "person-1",
    );

    expect(requestBody?.get("owner_type")).toBe("MISSING_PERSON");
    expect(requestBody?.get("owner_id")).toBe("person-1");
    expect(requestHeaders?.get("X-API-Key")).toBeTruthy();
    expect(result.totalReferences).toBe(1);
    expect(result.references[0]?.biometricRecordId).toBe("bio-1");
  });
});
