import type { ShelterStatus } from "@luzinga/contracts";
import { BadRequestError } from "@/shared/errors/app-error";

export interface ShelteredPerson {
  id: string;
  institutionId: string;
  fullName: string;
  approxAge: string | null;
  foundLocation: string | null;
  status: ShelterStatus;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

export interface CreateShelteredPersonInput {
  fullName: string;
  approxAge?: string | null;
  foundLocation?: string | null;
}

export interface UpdateShelteredPersonInput {
  fullName?: string;
  approxAge?: string | null;
  foundLocation?: string | null;
  status?: ShelterStatus;
}

function normalizeOptional(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null;
  return value.trim().replace(/\s+/g, " ") || null;
}

export function normalizeShelteredPersonInput(input: CreateShelteredPersonInput) {
  const fullName = input.fullName.trim().replace(/\s+/g, " ");
  if (fullName.length < 2) {
    throw new BadRequestError("O nome informado deve ter ao menos 2 caracteres.");
  }
  return {
    fullName,
    approxAge: normalizeOptional(input.approxAge),
    foundLocation: normalizeOptional(input.foundLocation),
  };
}

export function normalizeShelteredPersonUpdate(input: UpdateShelteredPersonInput) {
  return {
    fullName:
      input.fullName === undefined
        ? undefined
        : normalizeShelteredPersonInput({ fullName: input.fullName }).fullName,
    approxAge:
      input.approxAge === undefined ? undefined : normalizeOptional(input.approxAge),
    foundLocation:
      input.foundLocation === undefined
        ? undefined
        : normalizeOptional(input.foundLocation),
    status: input.status,
  };
}
