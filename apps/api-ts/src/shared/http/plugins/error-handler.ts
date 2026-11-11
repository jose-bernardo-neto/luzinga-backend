import { Elysia } from "elysia";
import { env } from "@/shared/config/env";
import { AppError } from "@/shared/errors/app-error";
import { logger } from "@/shared/logger";

function isValidationError(error: unknown): error is { all: unknown } {
  return typeof error === "object" && error !== null && "all" in error;
}

export const errorHandler = new Elysia({ name: "error-handler" })
  .onError(({ code, error, set, request }) => {
    if (error instanceof AppError) {
      set.status = error.statusCode;

      return {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      };
    }

    if (code === "VALIDATION" || code === "INVALID_FILE_TYPE") {
      set.status = 422;

      return {
        error: {
          code: "VALIDATION_ERROR",
          message: "Dados inválidos.",
          details: isValidationError(error) ? error.all : undefined,
        },
      };
    }

    if (code === "PARSE") {
      set.status = 400;

      return {
        error: {
          code: "INVALID_BODY",
          message: "Corpo da requisição inválido.",
        },
      };
    }

    if (code === "NOT_FOUND") {
      set.status = 404;

      return {
        error: {
          code: "NOT_FOUND",
          message: "Recurso não encontrado.",
        },
      };
    }

    logger.error("Erro não tratado na requisição", {
      code,
      method: request.method,
      path: new URL(request.url).pathname,
      message: error instanceof Error ? error.message : String(error),
      stack: env.isProduction || !(error instanceof Error) ? undefined : error.stack,
    });

    set.status = 500;

    return {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Erro interno do servidor.",
      },
    };
  })
  .as("global");
