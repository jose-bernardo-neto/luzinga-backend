import type { BiometricOwnerType } from "@luzinga/contracts";
import type {
  BiometricEnrollmentResult,
  FaceImage,
} from "@/modules/matching/domain/face-matching";
import type { BiometricOwnerAccessPort } from "@/modules/matching/ports/biometric-owner-access.port";
import type { FaceMatchingPort } from "@/modules/matching/ports/face-matching.port";
import { BadRequestError } from "@/shared/errors/app-error";

export interface RegisterBiometricReferencesInput {
  ownerType: BiometricOwnerType;
  ownerId: string;
  actorId: string;
  images: FaceImage[];
}

export class RegisterBiometricReferences {
  constructor(
    private readonly ownerAccess: BiometricOwnerAccessPort,
    private readonly faceMatching: FaceMatchingPort,
  ) {}

  async execute(
    input: RegisterBiometricReferencesInput,
  ): Promise<BiometricEnrollmentResult> {
    if (input.images.length < 1 || input.images.length > 3) {
      throw new BadRequestError(
        "Envie entre 1 e 3 fotos para o cadastro biométrico.",
      );
    }

    await this.ownerAccess.assertCanManage(
      input.ownerType,
      input.ownerId,
      input.actorId,
    );

    return this.faceMatching.enroll(
      input.images,
      input.ownerType,
      input.ownerId,
    );
  }
}
