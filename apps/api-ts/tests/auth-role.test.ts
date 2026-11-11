import { describe, expect, test } from "bun:test";
import { isUserRole } from "@/modules/auth/domain/role";

describe("perfis de autenticação", () => {
  test("aceita somente cidadão e administrador institucional", () => {
    expect(isUserRole("CITIZEN")).toBe(true);
    expect(isUserRole("INSTITUTION_ADMIN")).toBe(true);
    expect(isUserRole("PLATFORM_ADMIN")).toBe(true);
    expect(isUserRole("ADMIN")).toBe(false);
    expect(isUserRole(null)).toBe(false);
  });
});
