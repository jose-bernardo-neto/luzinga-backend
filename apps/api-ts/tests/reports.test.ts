import { describe, expect, mock, test } from "bun:test";
import type { ReportStatus } from "@luzinga/contracts";
import { CreateMissingPersonReport } from "@/modules/reports/application/create-missing-person-report";
import { GetMissingPersonReport } from "@/modules/reports/application/get-missing-person-report";
import { ListMissingPersonReports } from "@/modules/reports/application/list-missing-person-reports";
import { UpdateMissingPersonReportStatus } from "@/modules/reports/application/update-missing-person-report-status";
import {
  assertReportStatus,
  normalizeCreateMissingPersonReportInput,
  type MissingPersonReport,
  type NewMissingPersonReport,
  type SearchMissingPersonReportsFilters,
  type SearchMissingPersonReportsResult,
} from "@/modules/reports/domain/missing-person-report";
import type { MissingPersonReportRepository } from "@/modules/reports/ports/missing-person-report.repository";
import { BadRequestError, ForbiddenError, NotFoundError } from "@/shared/errors/app-error";

const report: MissingPersonReport = {
  id: "7f444dd0-bfeb-4a14-9e2f-c751f721e13d",
  reporterId: "user-1",
  fullName: "Maria da Silva",
  age: 31,
  birthPlace: "Luanda",
  parentNames: ["Ana da Silva"],
  lastSeenAddress: "Centro",
  status: "ACTIVE",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

function repository(overrides: Partial<MissingPersonReportRepository> = {}) {
  return {
    create: mock(async (input: NewMissingPersonReport) => ({ ...report, ...input })),
    findById: mock(async () => report as MissingPersonReport | null),
    search: mock(async (filters: SearchMissingPersonReportsFilters) => ({
      items: [report],
      total: 1,
      ...filters,
    }) as SearchMissingPersonReportsResult),
    updateStatus: mock(async (_id: string, status: ReportStatus) => ({ ...report, status })),
    ...overrides,
  } satisfies MissingPersonReportRepository;
}

describe("domínio de relatórios", () => {
  test("normaliza os dados e inicia a ficha como ativa", () => {
    expect(normalizeCreateMissingPersonReportInput({
      reporterId: "user-1",
      fullName: "  Maria   da Silva ",
      birthPlace: "  Luanda  ",
      parentNames: [" Ana   da Silva ", "  "],
    })).toEqual({
      reporterId: "user-1",
      fullName: "Maria da Silva",
      age: null,
      birthPlace: "Luanda",
      parentNames: ["Ana da Silva"],
      lastSeenAddress: null,
      status: "ACTIVE",
    });
  });

  test("rejeita nome curto, idade inválida e status desconhecido", () => {
    expect(() => normalizeCreateMissingPersonReportInput({ reporterId: "u", fullName: "Al" })).toThrow(BadRequestError);
    expect(() => normalizeCreateMissingPersonReportInput({ reporterId: "u", fullName: "Nome válido", age: 131 })).toThrow(BadRequestError);
    expect(() => assertReportStatus("UNKNOWN")).toThrow(BadRequestError);
  });
});

describe("casos de uso de relatórios", () => {
  test("cria uma ficha persistindo a entrada normalizada", async () => {
    const repo = repository();
    const result = await new CreateMissingPersonReport(repo).execute({
      reporterId: "user-1",
      fullName: "  Maria   da Silva ",
    });

    expect(result.status).toBe("ACTIVE");
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ fullName: "Maria da Silva" }));
  });

  test("consulta por ID e sinaliza ficha inexistente", async () => {
    expect(await new GetMissingPersonReport(repository()).execute(report.id)).toEqual(report);

    const missing = repository({ findById: mock(async () => null) });
    expect(new GetMissingPersonReport(missing).execute(report.id)).rejects.toBeInstanceOf(NotFoundError);
  });

  test("normaliza busca e paginação", async () => {
    const repo = repository();
    await new ListMissingPersonReports(repo).execute({ query: "  Maria  ", limit: 500, offset: -2 });
    expect(repo.search).toHaveBeenCalledWith({ query: "Maria", status: undefined, limit: 100, offset: 0 });
  });

  test("permite apenas ao autor atualizar o status", async () => {
    const repo = repository();
    const updated = await new UpdateMissingPersonReportStatus(repo).execute({
      id: report.id,
      status: "FOUND",
      actorId: "user-1",
    });
    expect(updated.status).toBe("FOUND");

    expect(new UpdateMissingPersonReportStatus(repo).execute({
      id: report.id,
      status: "ARCHIVED",
      actorId: "other-user",
    })).rejects.toBeInstanceOf(ForbiddenError);
  });
});
