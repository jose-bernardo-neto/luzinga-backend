import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Não usamos env() aqui para permitir `prisma generate` em CI sem DATABASE_URL.
    // O valor é obrigatório apenas em comandos que conectam ao banco.
    url: process.env.DATABASE_URL ?? "",
  },
});
