export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Requisição inválida.", details?: unknown) {
    super(400, "BAD_REQUEST", message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Sessão inválida ou expirada.") {
    super(401, "UNAUTHORIZED", message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Você não tem permissão para acessar este recurso.") {
    super(403, "FORBIDDEN", message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Recurso não encontrado.") {
    super(404, "NOT_FOUND", message);
  }
}

export class ConflictError extends AppError {
  constructor(message = "O recurso já existe.") {
    super(409, "CONFLICT", message);
  }
}

export class UnprocessableEntityError extends AppError {
  constructor(message = "Dados inválidos.", details?: unknown) {
    super(422, "VALIDATION_ERROR", message, details);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = "Serviço temporariamente indisponível.", details?: unknown) {
    super(503, "SERVICE_UNAVAILABLE", message, details);
  }
}
