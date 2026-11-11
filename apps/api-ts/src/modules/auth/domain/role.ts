import { USER_ROLES, type UserRole } from "@luzinga/contracts";

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && USER_ROLES.includes(value as UserRole);
}
