/**
 * Contratos compartilhados entre os apps do monorepo.
 * Mantenha aqui apenas tipos/constantes estáveis de domínio e de API.
 */

export const USER_ROLES = ["CITIZEN", "INSTITUTION_ADMIN"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const REPORT_STATUSES = ["ACTIVE", "FOUND", "ARCHIVED"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const SHELTER_STATUSES = ["UNCLAIMED", "IDENTIFIED", "REUNITED"] as const;
export type ShelterStatus = (typeof SHELTER_STATUSES)[number];

export const BIOMETRIC_OWNER_TYPES = [
  "MISSING_PERSON",
  "SHELTERED_PERSON",
] as const;
export type BiometricOwnerType = (typeof BIOMETRIC_OWNER_TYPES)[number];

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
