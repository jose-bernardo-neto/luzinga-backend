import type {
  FaceDetectionResult,
  FaceImage,
  FaceMatchOptions,
  FaceMatchResult,
} from "@/modules/matching/domain/face-matching";

/**
 * Porta de saída para o serviço de visão computacional (apps/ai-python).
 */
export interface FaceMatchingPort {
  detect(image: FaceImage): Promise<FaceDetectionResult>;
  match(image: FaceImage, options: FaceMatchOptions): Promise<FaceMatchResult>;
}
