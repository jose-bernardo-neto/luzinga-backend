import type { InstitutionStatus } from "@luzinga/contracts";
import {
  normalizeInstitutionData,
  normalizeInstitutionUpdate,
  type InstitutionDataInput,
  type UpdateInstitutionDataInput,
} from "@/modules/institutions/domain/institution";
import type { InstitutionRepository } from "@/modules/institutions/ports/institution.repository";
import { ConflictError, NotFoundError } from "@/shared/errors/app-error";

export class CreateInstitution {
  constructor(private readonly repository: InstitutionRepository) {}

  async execute(userId: string, input: InstitutionDataInput) {
    if (await this.repository.findByUserId(userId)) {
      throw new ConflictError("Este usuário já possui uma instituição.");
    }
    const normalized = normalizeInstitutionData(input);
    if (
      normalized.document &&
      (await this.repository.findByDocument(normalized.document))
    ) {
      throw new ConflictError("Documento institucional já cadastrado.");
    }
    return this.repository.create(userId, normalized);
  }
}

export class GetOwnInstitution {
  constructor(private readonly repository: InstitutionRepository) {}

  async execute(userId: string) {
    const institution = await this.repository.findByUserId(userId);
    if (!institution) throw new NotFoundError("Instituição não encontrada.");
    return institution;
  }
}

export class UpdateOwnInstitution {
  constructor(private readonly repository: InstitutionRepository) {}

  async execute(userId: string, input: UpdateInstitutionDataInput) {
    const institution = await this.repository.findByUserId(userId);
    if (!institution) throw new NotFoundError("Instituição não encontrada.");

    const normalized = normalizeInstitutionUpdate(input);
    if (normalized.document && normalized.document !== institution.document) {
      const owner = await this.repository.findByDocument(normalized.document);
      if (owner && owner.id !== institution.id) {
        throw new ConflictError("Documento institucional já cadastrado.");
      }
    }
    const legalIdentityChanged =
      (normalized.legalName !== undefined && normalized.legalName !== institution.legalName) ||
      (normalized.document !== undefined && normalized.document !== institution.document);

    const updated = await this.repository.update(institution.id, normalized);
    if (legalIdentityChanged && institution.status === "VERIFIED") {
      return this.repository.updateStatus(institution.id, "PENDING");
    }
    return updated;
  }
}

export class ListInstitutions {
  constructor(private readonly repository: InstitutionRepository) {}
  execute(status?: InstitutionStatus) {
    return this.repository.list(status);
  }
}

export class ReviewInstitution {
  constructor(private readonly repository: InstitutionRepository) {}

  async execute(id: string, status: InstitutionStatus) {
    const institution = await this.repository.findById(id);
    if (!institution) throw new NotFoundError("Instituição não encontrada.");
    return this.repository.updateStatus(id, status);
  }
}
