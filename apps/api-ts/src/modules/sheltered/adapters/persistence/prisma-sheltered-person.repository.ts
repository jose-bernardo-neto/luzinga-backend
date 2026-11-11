import type { ShelterStatus } from "@luzinga/contracts";
import type { PrismaClient } from "@/generated/prisma/client";
import type {
  CreateShelteredPersonInput,
  UpdateShelteredPersonInput,
} from "@/modules/sheltered/domain/sheltered-person";
import type { ShelteredPersonRepository } from "@/modules/sheltered/ports/sheltered-person.repository";

export class PrismaShelteredPersonRepository implements ShelteredPersonRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(institutionId: string, input: CreateShelteredPersonInput) {
    return this.prisma.shelteredPerson.create({ data: { institutionId, ...input } });
  }

  findByIdForInstitution(id: string, institutionId: string) {
    return this.prisma.shelteredPerson.findFirst({ where: { id, institutionId } });
  }

  list(
    institutionId: string,
    filters: { status?: ShelterStatus; includeArchived: boolean },
  ) {
    return this.prisma.shelteredPerson.findMany({
      where: {
        institutionId,
        status: filters.status,
        archivedAt: filters.includeArchived ? undefined : null,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  update(id: string, input: UpdateShelteredPersonInput) {
    return this.prisma.shelteredPerson.update({ where: { id }, data: input });
  }

  setArchivedAt(id: string, archivedAt: Date | null) {
    return this.prisma.shelteredPerson.update({
      where: { id },
      data: { archivedAt },
    });
  }
}
