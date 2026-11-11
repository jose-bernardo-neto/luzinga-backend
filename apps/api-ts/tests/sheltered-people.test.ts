import { describe, expect, mock, test } from "bun:test";
import type { Institution } from "@/modules/institutions/domain/institution";
import type { InstitutionRepository } from "@/modules/institutions/ports/institution.repository";
import {
  ArchiveShelteredPerson,
  CreateShelteredPerson,
  RestoreShelteredPerson,
} from "@/modules/sheltered/application/sheltered-person.use-cases";
import type { ShelteredPerson } from "@/modules/sheltered/domain/sheltered-person";
import type { ShelteredPersonRepository } from "@/modules/sheltered/ports/sheltered-person.repository";
import { ConflictError, ForbiddenError } from "@/shared/errors/app-error";

const institution: Institution = {
  id: "2a2eb35d-dc8a-4816-a394-37ab97331cdb",
  userId: "user-1",
  name: "Lar Esperança",
  legalName: null,
  document: null,
  address: "Luanda",
  contactPhone: "900",
  status: "VERIFIED",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const person: ShelteredPerson = {
  id: "f74579ac-ddf6-4716-9814-41c8617d85a7",
  institutionId: institution.id,
  fullName: "Pessoa não identificada",
  approxAge: "30-40",
  foundLocation: "Luanda",
  status: "UNCLAIMED",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  archivedAt: null,
};

function institutionRepository(status = institution.status): InstitutionRepository {
  return {
    create: mock(),
    findById: mock(async () => ({ ...institution, status })),
    findByUserId: mock(async () => ({ ...institution, status })),
    findByDocument: mock(async () => null),
    list: mock(async () => []),
    update: mock(),
    updateStatus: mock(),
  };
}

function shelteredRepository(current = person): ShelteredPersonRepository {
  return {
    create: mock(async (institutionId, input) => ({ ...person, ...input, institutionId })),
    findByIdForInstitution: mock(async () => current),
    list: mock(async () => [current]),
    update: mock(async (_id, input) => ({ ...current, ...input })),
    setArchivedAt: mock(async (_id, archivedAt) => ({ ...current, archivedAt })),
  };
}

describe("gestão de acolhidos", () => {
  test("instituição verificada cadastra pessoa", async () => {
    const people = shelteredRepository();
    const result = await new CreateShelteredPerson(
      institutionRepository(),
      people,
    ).execute("user-1", {
      fullName: "  Pessoa   não identificada ",
      approxAge: " 30-40 ",
    });

    expect(result.fullName).toBe("Pessoa não identificada");
    expect(people.create).toHaveBeenCalledWith(
      institution.id,
      expect.objectContaining({ approxAge: "30-40" }),
    );
  });

  test("instituição pendente não cadastra pessoa", () => {
    const useCase = new CreateShelteredPerson(
      institutionRepository("PENDING"),
      shelteredRepository(),
    );
    expect(useCase.execute("user-1", { fullName: "Pessoa" })).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  test("arquiva e restaura sem excluir o registro", async () => {
    const people = shelteredRepository();
    const archived = await new ArchiveShelteredPerson(
      institutionRepository(),
      people,
    ).execute("user-1", person.id);
    expect(archived.archivedAt).toBeInstanceOf(Date);

    const archivedPeople = shelteredRepository({ ...person, archivedAt: new Date() });
    const restored = await new RestoreShelteredPerson(
      institutionRepository(),
      archivedPeople,
    ).execute("user-1", person.id);
    expect(restored.archivedAt).toBeNull();
  });

  test("não arquiva duas vezes", () => {
    const useCase = new ArchiveShelteredPerson(
      institutionRepository(),
      shelteredRepository({ ...person, archivedAt: new Date() }),
    );
    expect(useCase.execute("user-1", person.id)).rejects.toBeInstanceOf(ConflictError);
  });
});
