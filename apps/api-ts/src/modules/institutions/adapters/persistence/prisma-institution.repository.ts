import type { InstitutionStatus } from "@luzinga/contracts";
import type { PrismaClient } from "@/generated/prisma/client";
import type {
  InstitutionDataInput,
  UpdateInstitutionDataInput,
} from "@/modules/institutions/domain/institution";
import type { InstitutionRepository } from "@/modules/institutions/ports/institution.repository";

export class PrismaInstitutionRepository implements InstitutionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(userId: string, input: InstitutionDataInput) {
    return this.prisma.institution.create({ data: { userId, ...input } });
  }

  findById(id: string) {
    return this.prisma.institution.findUnique({ where: { id } });
  }

  findByUserId(userId: string) {
    return this.prisma.institution.findUnique({ where: { userId } });
  }

  findByDocument(document: string) {
    return this.prisma.institution.findUnique({ where: { document } });
  }

  list(status?: InstitutionStatus) {
    return this.prisma.institution.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
    });
  }

  update(id: string, input: UpdateInstitutionDataInput) {
    return this.prisma.institution.update({ where: { id }, data: input });
  }

  updateStatus(id: string, status: InstitutionStatus) {
    return this.prisma.institution.update({ where: { id }, data: { status } });
  }
}
