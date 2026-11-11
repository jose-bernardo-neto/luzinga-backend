import type { InstitutionStatus } from "@luzinga/contracts";
import type {
  Institution,
  InstitutionDataInput,
  UpdateInstitutionDataInput,
} from "@/modules/institutions/domain/institution";

export interface InstitutionRepository {
  create(userId: string, input: InstitutionDataInput): Promise<Institution>;
  findById(id: string): Promise<Institution | null>;
  findByUserId(userId: string): Promise<Institution | null>;
  findByDocument(document: string): Promise<Institution | null>;
  list(status?: InstitutionStatus): Promise<Institution[]>;
  update(id: string, input: UpdateInstitutionDataInput): Promise<Institution>;
  updateStatus(id: string, status: InstitutionStatus): Promise<Institution>;
}
