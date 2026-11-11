import { createApp } from "@/app";
import { env } from "@/shared/config/env";
import { prisma } from "@/shared/database/prisma";
import { logger } from "@/shared/logger";

const app = createApp();

app.listen(env.PORT);

logger.info("API iniciada", {
  port: env.PORT,
  environment: env.NODE_ENV,
  docs: `http://localhost:${env.PORT}/docs`,
});

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  logger.info("Encerrando API", { signal });

  try {
    await app.stop();
    await prisma.$disconnect();
  } finally {
    process.exit(0);
  }
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
