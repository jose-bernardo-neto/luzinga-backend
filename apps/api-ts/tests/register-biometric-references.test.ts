import { describe, expect, mock, test } from "bun:test";
import { RegisterBiometricReferences } from "@/modules/matching/application/register-biometric-references";
import type { FaceImage } from "@/modules/matching/domain/face-matching";
import type { BiometricOwnerAccessPort } from "@/modules/matching/ports/biometric-owner-access.port";
import type { FaceMatchingPort } from "@/modules/matching/ports/face-matching.port";

const image: FaceImage = {
  buffer: Buffer.from("image"),
  mimeType: "image/jpeg",
  filename: "face.jpg",
};

describe("cadastro de referências biométricas", () => {
  test("valida a propriedade antes de enviar as imagens ao serviço", async () => {
    const assertCanManage = mock(async () => undefined);
    const enroll = mock(async () => ({ references: [], totalReferences: 2 }));
    const access: BiometricOwnerAccessPort = { assertCanManage };
    const matching: FaceMatchingPort = {
      detect: mock(),
      match: mock(),
      enroll,
    };
    const useCase = new RegisterBiometricReferences(access, matching);

    const result = await useCase.execute({
      ownerType: "MISSING_PERSON",
      ownerId: "7f444dd0-bfeb-4a14-9e2f-c751f721e13d",
      actorId: "user-1",
      images: [image, image],
    });

    expect(assertCanManage).toHaveBeenCalledWith(
      "MISSING_PERSON",
      "7f444dd0-bfeb-4a14-9e2f-c751f721e13d",
      "user-1",
    );
    expect(enroll).toHaveBeenCalledWith(
      [image, image],
      "MISSING_PERSON",
      "7f444dd0-bfeb-4a14-9e2f-c751f721e13d",
    );
    expect(result.totalReferences).toBe(2);
  });

  test("rejeita mais de três imagens antes de consultar dependências", async () => {
    const assertCanManage = mock(async () => undefined);
    const access: BiometricOwnerAccessPort = { assertCanManage };
    const matching: FaceMatchingPort = {
      detect: mock(),
      match: mock(),
      enroll: mock(),
    };
    const useCase = new RegisterBiometricReferences(access, matching);

    expect(useCase.execute({
      ownerType: "SHELTERED_PERSON",
      ownerId: "7f444dd0-bfeb-4a14-9e2f-c751f721e13d",
      actorId: "user-1",
      images: [image, image, image, image],
    })).rejects.toThrow("entre 1 e 3 fotos");
    expect(assertCanManage).not.toHaveBeenCalled();
  });
});
