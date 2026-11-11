import type { InstitutionStatus } from "@luzinga/contracts";
import { BadRequestError } from "@/shared/errors/app-error";

export interface Institution {
  id: string;
  userId: string;
  name: string;
  legalName: string | null;
  document: string | null;
  address: string;
  contactPhone: string;
  status: InstitutionStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface InstitutionDataInput {
  name: string;
  legalName: string;
  document: string;
  address: string;
  contactPhone: string;
}

export interface UpdateInstitutionDataInput {
  name?: string;
  legalName?: string | null;
  document?: string | null;
  address?: string;
  contactPhone?: string;
}

function normalizedRequired(value: string, field: string): string {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length < 2) {
    throw new BadRequestError(`${field} deve ter ao menos 2 caracteres.`);
  }
  return normalized;
}

function normalizedOptional(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized || null;
}

export function normalizeInstitutionData(input: InstitutionDataInput) {
  return {
    name: normalizedRequired(input.name, "Nome da instituição"),
    legalName: normalizedRequired(input.legalName, "Razão social"),
    document: normalizedRequired(input.document, "Documento institucional"),
    address: normalizedRequired(input.address, "Endereço"),
    contactPhone: normalizedRequired(input.contactPhone, "Telefone"),
  };
}

export function normalizeInstitutionUpdate(input: UpdateInstitutionDataInput) {
  return {
    name: input.name === undefined ? undefined : normalizedRequired(input.name, "Nome da instituição"),
    legalName: input.legalName === undefined ? undefined : normalizedOptional(input.legalName),
    document: input.document === undefined ? undefined : normalizedOptional(input.document),
    address: input.address === undefined ? undefined : normalizedRequired(input.address, "Endereço"),
    contactPhone:
      input.contactPhone === undefined
        ? undefined
        : normalizedRequired(input.contactPhone, "Telefone"),
  };
}
