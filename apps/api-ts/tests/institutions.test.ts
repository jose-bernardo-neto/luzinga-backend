import { describe, expect, mock, test } from "bun:test";
import {
  CreateInstitution,
  UpdateOwnInstitution,
} from "@/modules/institutions/application/institution.use-cases";
import type { Institution } from "@/modules/institutions/domain/institution";
import type { InstitutionRepository } from "@/modules/institutions/ports/institution.repository";

const institution: Institution = {
  id: "2a2eb35d-dc8a-4816-a394-37ab97331cdb",
  userId: "user-1",
  name: "Lar Esperança",
  legalName: "Lar Esperança, Lda.",
  document: "DOC-1",
  address: "Luanda",
  contactPhone: "+244 900 000 000",
  status: "VERIFIED",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

function repository(overrides: Partial<InstitutionRepository> = {}) {
  return {
    create: mock(async (userId, input) => ({ ...institution, ...input, userId })),
    findById: mock(async () => institution),
    findByUserId: mock(async () => null as Institution | null),
    findByDocument: mock(async () => null as Institution | null),
    list: mock(async () => [institution]),
    update: mock(async (_id, input) => ({ ...institution, ...input })),
    updateStatus: mock(async (_id, status) => ({ ...institution, status })),
    ...overrides,
  } satisfies InstitutionRepository;
}

describe("instituições", () => {
  test("cria instituição pendente com dados normalizados", async () => {
    const repo = repository();
    await new CreateInstitution(repo).execute("user-1", {
      name: "  Lar   Esperança ",
      legalName: " Lar Esperança, Lda. ",
      document: " DOC-1 ",
      address: " Luanda ",
      contactPhone: " +244 900 000 000 ",
    });

    expect(repo.create).toHaveBeenCalledWith("user-1", {
      name: "Lar Esperança",
      legalName: "Lar Esperança, Lda.",
      document: "DOC-1",
      address: "Luanda",
      contactPhone: "+244 900 000 000",
    });
  });

  test("alteração legal faz instituição verificada voltar a pendente", async () => {
    const repo = repository({ findByUserId: mock(async () => institution) });
    const result = await new UpdateOwnInstitution(repo).execute("user-1", {
      document: "DOC-2",
    });

    expect(repo.updateStatus).toHaveBeenCalledWith(institution.id, "PENDING");
    expect(result.status).toBe("PENDING");
  });

  test("alteração operacional preserva verificação", async () => {
    const repo = repository({ findByUserId: mock(async () => institution) });
    const result = await new UpdateOwnInstitution(repo).execute("user-1", {
      address: "Benguela",
    });

    expect(repo.updateStatus).not.toHaveBeenCalled();
    expect(result.status).toBe("VERIFIED");
  });
});
