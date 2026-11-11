import { Elysia, t } from "elysia";
import { authPlugin } from "@/modules/auth/adapters/http/auth.plugin";
import type {
  CreateInstitution,
  GetOwnInstitution,
  ListInstitutions,
  ReviewInstitution,
  UpdateOwnInstitution,
} from "@/modules/institutions/application/institution.use-cases";

export interface InstitutionRoutesDependencies {
  createInstitution: CreateInstitution;
  getOwnInstitution: GetOwnInstitution;
  updateOwnInstitution: UpdateOwnInstitution;
  listInstitutions: ListInstitutions;
  reviewInstitution: ReviewInstitution;
}

const institutionStatus = t.Union([
  t.Literal("PENDING"),
  t.Literal("VERIFIED"),
  t.Literal("SUSPENDED"),
  t.Literal("REJECTED"),
]);

const institutionData = {
  name: t.String({ minLength: 2, maxLength: 160 }),
  legalName: t.String({ minLength: 2, maxLength: 200 }),
  document: t.String({ minLength: 2, maxLength: 80 }),
  address: t.String({ minLength: 2, maxLength: 255 }),
  contactPhone: t.String({ minLength: 2, maxLength: 40 }),
};

export function createInstitutionRoutes(dependencies: InstitutionRoutesDependencies) {
  return new Elysia({ prefix: "/institutions", tags: ["Instituições"] })
    .use(authPlugin)
    .post(
      "",
      ({ body, user }) => dependencies.createInstitution.execute(user.id, body),
      {
        requireRole: ["INSTITUTION_ADMIN"],
        body: t.Object(institutionData),
        detail: { summary: "Cadastra a instituição do usuário" },
      },
    )
    .get(
      "/me",
      ({ user }) => dependencies.getOwnInstitution.execute(user.id),
      {
        requireRole: ["INSTITUTION_ADMIN"],
        detail: { summary: "Consulta a própria instituição" },
      },
    )
    .patch(
      "/me",
      ({ body, user }) => dependencies.updateOwnInstitution.execute(user.id, body),
      {
        requireRole: ["INSTITUTION_ADMIN"],
        body: t.Partial(
          t.Object({
            ...institutionData,
            legalName: t.Nullable(institutionData.legalName),
            document: t.Nullable(institutionData.document),
          }),
        ),
        detail: { summary: "Atualiza a própria instituição" },
      },
    )
    .get(
      "/admin",
      ({ query }) => dependencies.listInstitutions.execute(query.status),
      {
        requireRole: ["PLATFORM_ADMIN"],
        query: t.Object({ status: t.Optional(institutionStatus) }),
        detail: { summary: "Lista instituições para administração" },
      },
    )
    .patch(
      "/admin/:id/status",
      ({ params, body }) => dependencies.reviewInstitution.execute(params.id, body.status),
      {
        requireRole: ["PLATFORM_ADMIN"],
        params: t.Object({ id: t.String({ format: "uuid" }) }),
        body: t.Object({ status: institutionStatus }),
        detail: { summary: "Verifica, rejeita ou suspende uma instituição" },
      },
    );
}
