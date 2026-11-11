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
    }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    expect(await new AiServiceFaceMatchingClient().detect(image)).toEqual({
      faceDetected: true,
      quality: 0.87,
      message: "ok",
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
      });
    }) as unknown as typeof fetch;

    const result = await new AiServiceFaceMatchingClient().match(image, {
      limit: 5,
      threshold: 0.8,
    });

    const url = new URL(requestedUrl);
    expect(url.pathname).toBe("/match");
    expect(url.searchParams.get("limit")).toBe("5");
    expect(url.searchParams.get("threshold")).toBe("0.8");
    expect(requestBody).toBeInstanceOf(FormData);
    expect(result).toEqual({
      candidates: [{
        biometricRecordId: "bio-1",
        ownerType: "MISSING_PERSON",
        ownerId: "person-1",
        similarity: 0.91,
        imagePath: null,
      }],
      processingMs: 12,
    });
  });
});
