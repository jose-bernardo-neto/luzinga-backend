import type { ShelterStatus } from "@luzinga/contracts";
import type { Institution } from "@/modules/institutions/domain/institution";
import type { InstitutionRepository } from "@/modules/institutions/ports/institution.repository";
import {
  normalizeShelteredPersonInput,
  normalizeShelteredPersonUpdate,
  type CreateShelteredPersonInput,
  type UpdateShelteredPersonInput,
} from "@/modules/sheltered/domain/sheltered-person";
import type { ShelteredPersonRepository } from "@/modules/sheltered/ports/sheltered-person.repository";
import { ConflictError, ForbiddenError, NotFoundError } from "@/shared/errors/app-error";

async function verifiedInstitution(
  repository: InstitutionRepository,
  userId: string,
): Promise<Institution> {
  const institution = await repository.findByUserId(userId);
  if (!institution) throw new NotFoundError("Instituição não encontrada.");
  if (institution.status !== "VERIFIED") {
    throw new ForbiddenError("A instituição precisa estar verificada.");
  }
  return institution;
}

async function ownedPerson(
  institutions: InstitutionRepository,
  shelteredPeople: ShelteredPersonRepository,
  userId: string,
  id: string,
) {
  const institution = await verifiedInstitution(institutions, userId);
  const person = await shelteredPeople.findByIdForInstitution(id, institution.id);
  if (!person) throw new NotFoundError("Pessoa acolhida não encontrada.");
  return person;
}

export class CreateShelteredPerson {
  constructor(
    private readonly institutions: InstitutionRepository,
    private readonly shelteredPeople: ShelteredPersonRepository,
  ) {}
  async execute(userId: string, input: CreateShelteredPersonInput) {
    const institution = await verifiedInstitution(this.institutions, userId);
    return this.shelteredPeople.create(
      institution.id,
      normalizeShelteredPersonInput(input),
    );
  }
}

export class ListShelteredPeople {
  constructor(
    private readonly institutions: InstitutionRepository,
    private readonly shelteredPeople: ShelteredPersonRepository,
  ) {}
  async execute(
    userId: string,
    filters: { status?: ShelterStatus; includeArchived?: boolean },
  ) {
    const institution = await verifiedInstitution(this.institutions, userId);
    return this.shelteredPeople.list(institution.id, {
      status: filters.status,
      includeArchived: filters.includeArchived ?? false,
    });
  }
}

export class GetShelteredPerson {
  constructor(
    private readonly institutions: InstitutionRepository,
    private readonly shelteredPeople: ShelteredPersonRepository,
  ) {}
  execute(userId: string, id: string) {
    return ownedPerson(this.institutions, this.shelteredPeople, userId, id);
  }
}

export class UpdateShelteredPerson {
  constructor(
    private readonly institutions: InstitutionRepository,
    private readonly shelteredPeople: ShelteredPersonRepository,
  ) {}
  async execute(userId: string, id: string, input: UpdateShelteredPersonInput) {
    const person = await ownedPerson(this.institutions, this.shelteredPeople, userId, id);
    if (person.archivedAt) {
      throw new ConflictError("Restaure o registro antes de atualizá-lo.");
    }
    return this.shelteredPeople.update(id, normalizeShelteredPersonUpdate(input));
  }
}

export class ArchiveShelteredPerson {
  constructor(
    private readonly institutions: InstitutionRepository,
    private readonly shelteredPeople: ShelteredPersonRepository,
  ) {}
  async execute(userId: string, id: string) {
    const person = await ownedPerson(this.institutions, this.shelteredPeople, userId, id);
    if (person.archivedAt) throw new ConflictError("O registro já está arquivado.");
    return this.shelteredPeople.setArchivedAt(id, new Date());
  }
}

export class RestoreShelteredPerson {
  constructor(
    private readonly institutions: InstitutionRepository,
    private readonly shelteredPeople: ShelteredPersonRepository,
  ) {}
  async execute(userId: string, id: string) {
    const person = await ownedPerson(this.institutions, this.shelteredPeople, userId, id);
    if (!person.archivedAt) throw new ConflictError("O registro não está arquivado.");
    return this.shelteredPeople.setArchivedAt(id, null);
  }
}
