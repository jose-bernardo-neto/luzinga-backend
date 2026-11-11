import { REPORT_STATUSES, type ReportStatus } from "@luzinga/contracts";
import { BadRequestError } from "@/shared/errors/app-error";

export interface MissingPersonReport {
  id: string;
  reporterId: string;
  fullName: string;
  age: number | null;
  birthPlace: string | null;
  parentNames: string[];
  lastSeenAddress: string | null;
  status: ReportStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMissingPersonReportInput {
  reporterId: string;
  fullName: string;
  age?: number | null;
  birthPlace?: string | null;
  parentNames?: string[];
  lastSeenAddress?: string | null;
}

export type NewMissingPersonReport = Omit<
  MissingPersonReport,
  "id" | "createdAt" | "updatedAt"
>;

export interface SearchMissingPersonReportsFilters {
  query?: string;
  status?: ReportStatus;
  limit: number;
  offset: number;
}

export interface SearchMissingPersonReportsResult {
  items: MissingPersonReport[];
  total: number;
  limit: number;
  offset: number;
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeCreateMissingPersonReportInput(
  input: CreateMissingPersonReportInput,
): NewMissingPersonReport {
  const fullName = normalizeText(input.fullName);

  if (fullName.length < 3) {
    throw new BadRequestError("O nome completo deve ter ao menos 3 caracteres.");
  }

  if (fullName.length > 160) {
    throw new BadRequestError("O nome completo deve ter no máximo 160 caracteres.");
  }

  if (
    input.age !== undefined &&
    input.age !== null &&
    (!Number.isInteger(input.age) || input.age < 0 || input.age > 130)
  ) {
    throw new BadRequestError("A idade deve ser um número inteiro entre 0 e 130.");
  }

  const parentNames = (input.parentNames ?? [])
    .map(normalizeText)
    .filter(Boolean)
    .slice(0, 10);

  return {
    reporterId: input.reporterId,
    fullName,
    age: input.age ?? null,
    birthPlace: input.birthPlace ? normalizeText(input.birthPlace) : null,
    parentNames,
    lastSeenAddress: input.lastSeenAddress
      ? normalizeText(input.lastSeenAddress)
      : null,
    status: "ACTIVE",
  };
}

export function assertReportStatus(value: string): asserts value is ReportStatus {
  if (!REPORT_STATUSES.includes(value as ReportStatus)) {
    throw new BadRequestError("Status de relatório inválido.");
  }
}
