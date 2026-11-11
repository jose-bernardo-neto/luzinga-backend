import type { ShelterStatus } from "@luzinga/contracts";
import type {
  CreateShelteredPersonInput,
  ShelteredPerson,
  UpdateShelteredPersonInput,
} from "@/modules/sheltered/domain/sheltered-person";

export interface ShelteredPersonRepository {
  create(institutionId: string, input: CreateShelteredPersonInput): Promise<ShelteredPerson>;
  findByIdForInstitution(id: string, institutionId: string): Promise<ShelteredPerson | null>;
  list(
    institutionId: string,
    filters: { status?: ShelterStatus; includeArchived: boolean },
  ): Promise<ShelteredPerson[]>;
  update(id: string, input: UpdateShelteredPersonInput): Promise<ShelteredPerson>;
  setArchivedAt(id: string, archivedAt: Date | null): Promise<ShelteredPerson>;
}
