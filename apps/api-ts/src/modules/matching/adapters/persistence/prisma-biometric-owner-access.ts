import type { BiometricOwnerType } from "@luzinga/contracts";
import type { PrismaClient } from "@/generated/prisma/client";
import type { BiometricOwnerAccessPort } from "@/modules/matching/ports/biometric-owner-access.port";
import { ForbiddenError, NotFoundError } from "@/shared/errors/app-error";

export class PrismaBiometricOwnerAccess implements BiometricOwnerAccessPort {
  constructor(private readonly prisma: PrismaClient) {}

  async assertCanManage(
    ownerType: BiometricOwnerType,
    ownerId: string,
    actorId: string,
  ): Promise<void> {
    if (ownerType === "MISSING_PERSON") {
      const report = await this.prisma.missingPersonReport.findUnique({
        where: { id: ownerId },
        select: { reporterId: true },
      });

      if (!report) {
        throw new NotFoundError("Ficha de pessoa desaparecida não encontrada.");
      }

      if (report.reporterId !== actorId) {
        throw new ForbiddenError(
          "Apenas o autor da ficha pode cadastrar sua biometria.",
        );
      }

      return;
    }

    const shelteredPerson = await this.prisma.shelteredPerson.findUnique({
      where: { id: ownerId },
      select: {
        archivedAt: true,
        institution: {
          select: { userId: true, status: true },
        },
      },
    });

    if (!shelteredPerson) {
      throw new NotFoundError("Pessoa acolhida não encontrada.");
    }

    if (shelteredPerson.archivedAt) {
      throw new ForbiddenError(
        "Não é possível cadastrar biometria em um registro arquivado.",
      );
    }

    if (shelteredPerson.institution.userId !== actorId) {
      throw new ForbiddenError(
        "Apenas a instituição responsável pode cadastrar esta biometria.",
      );
    }

    if (shelteredPerson.institution.status !== "VERIFIED") {
      throw new ForbiddenError(
        "A instituição precisa estar verificada para cadastrar biometria.",
      );
    }
  }
}
