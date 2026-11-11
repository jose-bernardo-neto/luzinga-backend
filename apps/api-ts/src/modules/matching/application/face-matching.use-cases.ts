import type {
  FaceDetectionResult,
  FaceImage,
  FaceMatchResult,
} from "@/modules/matching/domain/face-matching";
import type { FaceMatchingPort } from "@/modules/matching/ports/face-matching.port";

export class DetectFace {
  constructor(private readonly faceMatching: FaceMatchingPort) {}

  async execute(image: FaceImage): Promise<FaceDetectionResult> {
    return this.faceMatching.detect(image);
  }
}

export interface FindFaceMatchesInput {
  image: FaceImage;
  limit?: number;
  threshold?: number;
}

export class FindFaceMatches {
  constructor(private readonly faceMatching: FaceMatchingPort) {}

  async execute(input: FindFaceMatchesInput): Promise<FaceMatchResult> {
    const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);
    const threshold = Math.min(Math.max(input.threshold ?? 0.5, 0), 1);

    return this.faceMatching.match(input.image, { limit, threshold });
  }
}
