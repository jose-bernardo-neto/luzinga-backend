import { describe, expect, mock, test } from "bun:test";
import { DetectFace, FindFaceMatches } from "@/modules/matching/application/face-matching.use-cases";
import type { FaceImage } from "@/modules/matching/domain/face-matching";
import type { FaceMatchingPort } from "@/modules/matching/ports/face-matching.port";

const image: FaceImage = {
  buffer: Buffer.from("image"),
  mimeType: "image/jpeg",
  filename: "face.jpg",
};

describe("casos de uso de reconhecimento facial", () => {
  test("encaminha a imagem para detecção", async () => {
    const detect = mock(async () => ({
      faceDetected: true,
      quality: 0.9,
      message: null,
      embeddingDimensions: 512,
    }));
    const port: FaceMatchingPort = { detect, match: mock(), enroll: mock() };

    expect(await new DetectFace(port).execute(image)).toEqual({
      faceDetected: true,
      quality: 0.9,
      message: null,
      embeddingDimensions: 512,
    });
    expect(detect).toHaveBeenCalledWith(image);
  });

  test("limita os parâmetros antes de encaminhar a comparação", async () => {
    const match = mock(async () => ({
      candidates: [],
      processingMs: 2,
      processedImages: 2,
    }));
    const port: FaceMatchingPort = { detect: mock(), match, enroll: mock() };

    await new FindFaceMatches(port).execute({
      images: [image, image],
      limit: 999,
      threshold: -1,
    });
    expect(match).toHaveBeenCalledWith([image, image], { limit: 100, threshold: 0 });
  });

  test("rejeita buscas sem foto ou com mais de três fotos", () => {
    const port: FaceMatchingPort = {
      detect: mock(),
      match: mock(),
      enroll: mock(),
    };
    const useCase = new FindFaceMatches(port);

    expect(useCase.execute({ images: [] })).rejects.toThrow("entre 1 e 3 fotos");
    expect(useCase.execute({ images: [image, image, image, image] })).rejects.toThrow(
      "entre 1 e 3 fotos",
    );
  });
});
