import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { Elysia } from "elysia";
import { authPlugin } from "@/modules/auth/adapters/http/auth.plugin";
import { authRoutes } from "@/modules/auth/adapters/http/auth.routes";
import { createInstitutionRoutes } from "@/modules/institutions/adapters/http/institution.routes";
import { PrismaInstitutionRepository } from "@/modules/institutions/adapters/persistence/prisma-institution.repository";
import {
  CreateInstitution,
  GetOwnInstitution,
  ListInstitutions,
  ReviewInstitution,
  UpdateOwnInstitution,
} from "@/modules/institutions/application/institution.use-cases";
import { AiServiceFaceMatchingClient } from "@/modules/matching/adapters/ai/ai-service-face-matching.client";
import { createMatchingRoutes } from "@/modules/matching/adapters/http/matching.routes";
import { PrismaBiometricOwnerAccess } from "@/modules/matching/adapters/persistence/prisma-biometric-owner-access";
import {
  DetectFace,
  FindFaceMatches,
} from "@/modules/matching/application/face-matching.use-cases";
import { RegisterBiometricReferences } from "@/modules/matching/application/register-biometric-references";
import { createReportsRoutes } from "@/modules/reports/adapters/http/reports.routes";
import { PrismaMissingPersonReportRepository } from "@/modules/reports/adapters/persistence/prisma-missing-person-report.repository";
import { CreateMissingPersonReport } from "@/modules/reports/application/create-missing-person-report";
import { GetMissingPersonReport } from "@/modules/reports/application/get-missing-person-report";
import { ListMissingPersonReports } from "@/modules/reports/application/list-missing-person-reports";
import { UpdateMissingPersonReportStatus } from "@/modules/reports/application/update-missing-person-report-status";
import { createShelteredPersonRoutes } from "@/modules/sheltered/adapters/http/sheltered-person.routes";
import { PrismaShelteredPersonRepository } from "@/modules/sheltered/adapters/persistence/prisma-sheltered-person.repository";
import {
  ArchiveShelteredPerson,
  CreateShelteredPerson,
  GetShelteredPerson,
  ListShelteredPeople,
  RestoreShelteredPerson,
  UpdateShelteredPerson,
} from "@/modules/sheltered/application/sheltered-person.use-cases";
import { env } from "@/shared/config/env";
import { prisma } from "@/shared/database/prisma";
import { errorHandler } from "@/shared/http/plugins/error-handler";
import { securityHeaders } from "@/shared/http/plugins/security-headers";

export function createApp() {
  // Composition root: adapters de saída são injetados nos casos de uso.
  const reportsRepository = new PrismaMissingPersonReportRepository(prisma);
  const createMissingPersonReport = new CreateMissingPersonReport(reportsRepository);
  const getMissingPersonReport = new GetMissingPersonReport(reportsRepository);
  const listMissingPersonReports = new ListMissingPersonReports(reportsRepository);
  const updateMissingPersonReportStatus = new UpdateMissingPersonReportStatus(
    reportsRepository,
  );

  const faceMatching = new AiServiceFaceMatchingClient();
  const detectFace = new DetectFace(faceMatching);
  const findFaceMatches = new FindFaceMatches(faceMatching);
  const biometricOwnerAccess = new PrismaBiometricOwnerAccess(prisma);
  const registerBiometricReferences = new RegisterBiometricReferences(
    biometricOwnerAccess,
    faceMatching,
  );

  const institutionsRepository = new PrismaInstitutionRepository(prisma);
  const createInstitution = new CreateInstitution(institutionsRepository);
  const getOwnInstitution = new GetOwnInstitution(institutionsRepository);
  const updateOwnInstitution = new UpdateOwnInstitution(institutionsRepository);
  const listInstitutions = new ListInstitutions(institutionsRepository);
  const reviewInstitution = new ReviewInstitution(institutionsRepository);

  const shelteredPeopleRepository = new PrismaShelteredPersonRepository(prisma);
  const createShelteredPerson = new CreateShelteredPerson(
    institutionsRepository,
    shelteredPeopleRepository,
  );
  const listShelteredPeople = new ListShelteredPeople(
    institutionsRepository,
    shelteredPeopleRepository,
  );
  const getShelteredPerson = new GetShelteredPerson(
    institutionsRepository,
    shelteredPeopleRepository,
  );
  const updateShelteredPerson = new UpdateShelteredPerson(
    institutionsRepository,
    shelteredPeopleRepository,
  );
  const archiveShelteredPerson = new ArchiveShelteredPerson(
    institutionsRepository,
    shelteredPeopleRepository,
  );
  const restoreShelteredPerson = new RestoreShelteredPerson(
    institutionsRepository,
    shelteredPeopleRepository,
  );

  return new Elysia({ name: "luzinga-api" })
    .use(
      cors({
        origin: env.CORS_ORIGINS,
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
      }),
    )
    .use(
      swagger({
        path: "/docs",
        documentation: {
          info: {
            title: "Luzinga API",
            version: "0.1.0",
            description:
              "API da plataforma de localização de pessoas desaparecidas e reconhecimento biométrico facial.",
          },
          tags: [
            { name: "Sistema", description: "Saúde e metadados da API." },
            {
              name: "Autenticação",
              description:
                "Rotas auxiliares. O Better Auth expõe sign-up, sign-in, sign-out e recuperação de senha em /api/auth/*.",
            },
            {
              name: "Relatórios",
              description: "Fichas de pessoas desaparecidas.",
            },
            {
              name: "Reconhecimento facial",
              description: "Detecção e busca por similaridade facial.",
            },
            { name: "Instituições", description: "Cadastro e verificação de instituições." },
            { name: "Acolhidos", description: "Gestão de pessoas acolhidas." },
          ],
        },
      }),
    )
    .use(errorHandler)
    .use(securityHeaders)
    .use(authPlugin)
    .use(authRoutes)
    .use(
      createInstitutionRoutes({
        createInstitution,
        getOwnInstitution,
        updateOwnInstitution,
        listInstitutions,
        reviewInstitution,
      }),
    )
    .use(
      createShelteredPersonRoutes({
        createShelteredPerson,
        listShelteredPeople,
        getShelteredPerson,
        updateShelteredPerson,
        archiveShelteredPerson,
        restoreShelteredPerson,
      }),
    )
    .use(
      createReportsRoutes({
        createMissingPersonReport,
        getMissingPersonReport,
        listMissingPersonReports,
        updateMissingPersonReportStatus,
      }),
    )
    .use(
      createMatchingRoutes({
        detectFace,
        findFaceMatches,
        registerBiometricReferences,
      }),
    )
    .get(
      "/health",
      () => ({
        status: "ok",
        service: "api-ts",
        timestamp: new Date().toISOString(),
      }),
      {
        detail: {
          tags: ["Sistema"],
          summary: "Health check",
        },
      },
    );
}
