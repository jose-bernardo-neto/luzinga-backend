import { describe, expect, test } from "bun:test";
import { Elysia, t } from "elysia";
import { BadRequestError } from "@/shared/errors/app-error";
import { errorHandler } from "@/shared/http/plugins/error-handler";
import { securityHeaders } from "@/shared/http/plugins/security-headers";

const app = new Elysia()
  .use(errorHandler)
  .use(securityHeaders)
  .get("/ok", () => ({ status: "ok" }))
  .get("/failure", () => { throw new BadRequestError("Entrada inválida."); });

const uploadApp = new Elysia()
  .use(errorHandler)
  .post("/upload", () => ({ ok: true }), {
    body: t.Object({ image: t.File({ type: ["image/png"] }) }),
  });

describe("infraestrutura HTTP", () => {
  test("adiciona cabeçalhos de segurança", async () => {
    const response = await app.handle(new Request("http://localhost/ok"));
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(response.headers.get("content-security-policy")).toContain("default-src 'none'");
  });

  test("serializa erros conhecidos", async () => {
    const response = await app.handle(new Request("http://localhost/failure"));
    expect(response.status).toBe(400);
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(await response.json()).toEqual({
      error: { code: "BAD_REQUEST", message: "Entrada inválida." },
    });
  });

  test("padroniza rota inexistente", async () => {
    const response = await app.handle(new Request("http://localhost/unknown"));
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: "NOT_FOUND", message: "Recurso não encontrado." },
    });
  });

  test("trata tipo de arquivo inválido como erro de validação", async () => {
    const body = new FormData();
    body.append("image", new File(["texto"], "arquivo.txt", { type: "text/plain" }));

    const response = await uploadApp.handle(new Request("http://localhost/upload", {
      method: "POST",
      body,
    }));

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      error: expect.objectContaining({
        code: "VALIDATION_ERROR",
        message: "Dados inválidos.",
      }),
    });
  });
});
