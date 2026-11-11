type NodeEnv = "development" | "test" | "production";

function required(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `Variável de ambiente obrigatória não definida: ${name}. Consulte apps/api-ts/.env.example.`,
    );
  }

  return value;
}

function optional(name: string, fallback: string): string {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : fallback;
}

function integer(name: string, fallback: number): number {
  const raw = process.env[name];

  if (!raw) {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Variável de ambiente inválida: ${name}.`);
  }

  return parsed;
}

function list(name: string, fallback: string[]): string[] {
  const raw = process.env[name]?.trim();

  if (!raw) {
    return fallback;
  }

  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const nodeEnvRaw = process.env.NODE_ENV ?? "development";

if (!["development", "test", "production"].includes(nodeEnvRaw)) {
  throw new Error(`NODE_ENV inválido: ${nodeEnvRaw}.`);
}

const nodeEnv = nodeEnvRaw as NodeEnv;
const port = integer("PORT", 3000);

export const env = {
  NODE_ENV: nodeEnv,
  isProduction: nodeEnv === "production",
  PORT: port,
  DATABASE_URL: required("DATABASE_URL"),
  BETTER_AUTH_SECRET: required("BETTER_AUTH_SECRET"),
  BETTER_AUTH_URL: optional("BETTER_AUTH_URL", `http://localhost:${port}`),
  CORS_ORIGINS: list("CORS_ORIGINS", ["http://localhost:3001"]),
  AI_SERVICE_URL: optional("AI_SERVICE_URL", "http://localhost:8000"),
  AI_SERVICE_TIMEOUT_MS: integer("AI_SERVICE_TIMEOUT_MS", 30_000),
  LOG_LEVEL: optional("LOG_LEVEL", nodeEnv === "production" ? "info" : "debug"),
} as const;
