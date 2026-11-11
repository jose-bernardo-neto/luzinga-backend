import type {
  FaceDetectionResult,
  FaceImage,
  FaceMatchResult,
} from "@/modules/matching/domain/face-matching";
import type { FaceMatchingPort } from "@/modules/matching/ports/face-matching.port";
import { BadRequestError } from "@/shared/errors/app-error";

export class DetectFace {
  constructor(private readonly faceMatching: FaceMatchingPort) {}

  async execute(image: FaceImage): Promise<FaceDetectionResult> {
    return this.faceMatching.detect(image);
  }
}

export interface FindFaceMatchesInput {
  images: FaceImage[];
  limit?: number;
  threshold?: number;
}

export class FindFaceMatches {
  constructor(private readonly faceMatching: FaceMatchingPort) {}

  async execute(input: FindFaceMatchesInput): Promise<FaceMatchResult> {
    if (input.images.length < 1 || input.images.length > 3) {
      throw new BadRequestError("A busca deve conter entre 1 e 3 fotos.");
    }

    const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);
    const threshold = Math.min(Math.max(input.threshold ?? 0.5, 0), 1);

    return this.faceMatching.match(input.images, { limit, threshold });
  }
}
