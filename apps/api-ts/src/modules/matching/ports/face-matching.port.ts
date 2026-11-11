import type {
  BiometricEnrollmentResult,
  FaceDetectionResult,
  FaceImage,
  FaceMatchOptions,
  FaceMatchResult,
} from "@/modules/matching/domain/face-matching";
import type { BiometricOwnerType } from "@luzinga/contracts";

/**
 * Porta de saída para o serviço de visão computacional (apps/ai-python).
 */
export interface FaceMatchingPort {
  detect(image: FaceImage): Promise<FaceDetectionResult>;
  match(images: FaceImage[], options: FaceMatchOptions): Promise<FaceMatchResult>;
  enroll(
    images: FaceImage[],
    ownerType: BiometricOwnerType,
    ownerId: string,
  ): Promise<BiometricEnrollmentResult>;
}
