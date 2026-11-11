import { Elysia, t } from "elysia";
import { authPlugin } from "@/modules/auth/adapters/http/auth.plugin";
import type { CreateMissingPersonReport } from "@/modules/reports/application/create-missing-person-report";
import type { GetMissingPersonReport } from "@/modules/reports/application/get-missing-person-report";
import type { ListMissingPersonReports } from "@/modules/reports/application/list-missing-person-reports";
import type { UpdateMissingPersonReportStatus } from "@/modules/reports/application/update-missing-person-report-status";

export interface ReportsRoutesDependencies {
  createMissingPersonReport: CreateMissingPersonReport;
  getMissingPersonReport: GetMissingPersonReport;
  listMissingPersonReports: ListMissingPersonReports;
  updateMissingPersonReportStatus: UpdateMissingPersonReportStatus;
}

const reportStatus = t.Union([
  t.Literal("ACTIVE"),
  t.Literal("FOUND"),
  t.Literal("ARCHIVED"),
]);

const reportIdParams = t.Object({
  id: t.String({ format: "uuid" }),
});

export function createReportsRoutes(dependencies: ReportsRoutesDependencies) {
  return new Elysia({
    prefix: "/reports",
    tags: ["Relatórios"],
  })
    .use(authPlugin)
    .post(
      "/missing",
      async ({ body, user }) => {
        const report = await dependencies.createMissingPersonReport.execute({
          reporterId: user.id,
          ...body,
        });

        return { report };
      },
      {
        auth: true,
        body: t.Object({
          fullName: t.String({ minLength: 3, maxLength: 160 }),
          age: t.Optional(t.Nullable(t.Integer({ minimum: 0, maximum: 130 }))),
          birthPlace: t.Optional(t.Nullable(t.String({ maxLength: 160 }))),
          parentNames: t.Optional(
            t.Array(t.String({ minLength: 2, maxLength: 160 }), { maxItems: 10 }),
          ),
          lastSeenAddress: t.Optional(t.Nullable(t.String({ maxLength: 255 }))),
        }),
        detail: {
          summary: "Cadastra uma ficha de pessoa desaparecida",
          description:
            "Cria uma ocorrência com status ACTIVE vinculada ao usuário autenticado (RF-10).",
        },
      },
    )
    .get(
      "/missing",
      ({ query }) =>
        dependencies.listMissingPersonReports.execute({
          query: query.q,
          status: query.status,
          limit: query.limit,
          offset: query.offset,
        }),
      {
        auth: true,
        query: t.Object({
          q: t.Optional(t.String({ maxLength: 160 })),
          status: t.Optional(reportStatus),
          limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
          offset: t.Optional(t.Numeric({ minimum: 0 })),
        }),
        detail: {
          summary: "Lista e busca fichas de desaparecidos",
          description:
            "Busca textual por nome, naturalidade, endereço e filiação (RF-06).",
        },
      },
    )
    .get(
      "/missing/:id",
      ({ params }) => dependencies.getMissingPersonReport.execute(params.id),
      {
        auth: true,
        params: reportIdParams,
        detail: {
          summary: "Retorna uma ficha de desaparecido pelo ID",
        },
      },
    )
    .patch(
      "/missing/:id/status",
      async ({ params, body, user }) => {
        const report = await dependencies.updateMissingPersonReportStatus.execute({
          id: params.id,
          status: body.status,
          actorId: user.id,
        });

        return { report };
      },
      {
        auth: true,
        params: reportIdParams,
        body: t.Object({
          status: reportStatus,
        }),
        detail: {
          summary: "Atualiza o status de uma ficha",
          description:
            "Somente o autor da ficha pode alterar o status (ACTIVE, FOUND ou ARCHIVED).",
        },
      },
    );
}
