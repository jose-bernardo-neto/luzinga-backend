import { Elysia, t } from "elysia";
import { authPlugin } from "@/modules/auth/adapters/http/auth.plugin";
import type {
  ArchiveShelteredPerson,
  CreateShelteredPerson,
  GetShelteredPerson,
  ListShelteredPeople,
  RestoreShelteredPerson,
  UpdateShelteredPerson,
} from "@/modules/sheltered/application/sheltered-person.use-cases";

export interface ShelteredPersonRoutesDependencies {
  createShelteredPerson: CreateShelteredPerson;
  listShelteredPeople: ListShelteredPeople;
  getShelteredPerson: GetShelteredPerson;
  updateShelteredPerson: UpdateShelteredPerson;
  archiveShelteredPerson: ArchiveShelteredPerson;
  restoreShelteredPerson: RestoreShelteredPerson;
}

const shelterStatus = t.Union([
  t.Literal("UNCLAIMED"),
  t.Literal("IDENTIFIED"),
  t.Literal("REUNITED"),
]);

const personData = {
  fullName: t.String({ minLength: 2, maxLength: 160 }),
  approxAge: t.Optional(t.Nullable(t.String({ maxLength: 80 }))),
  foundLocation: t.Optional(t.Nullable(t.String({ maxLength: 255 }))),
};

export function createShelteredPersonRoutes(
  dependencies: ShelteredPersonRoutesDependencies,
) {
  return new Elysia({ prefix: "/sheltered-people", tags: ["Acolhidos"] })
    .use(authPlugin)
    .post(
      "",
      ({ body, user }) => dependencies.createShelteredPerson.execute(user.id, body),
      {
        requireRole: ["INSTITUTION_ADMIN"],
        body: t.Object(personData),
        detail: { summary: "Cadastra uma pessoa acolhida" },
      },
    )
    .get(
      "",
      ({ query, user }) => dependencies.listShelteredPeople.execute(user.id, query),
      {
        requireRole: ["INSTITUTION_ADMIN"],
        query: t.Object({
          status: t.Optional(shelterStatus),
          includeArchived: t.Optional(t.BooleanString()),
        }),
        detail: { summary: "Lista pessoas da própria instituição" },
      },
    )
    .get(
      "/:id",
      ({ params, user }) => dependencies.getShelteredPerson.execute(user.id, params.id),
      {
        requireRole: ["INSTITUTION_ADMIN"],
        params: t.Object({ id: t.String({ format: "uuid" }) }),
        detail: { summary: "Consulta uma pessoa acolhida" },
      },
    )
    .patch(
      "/:id",
      ({ params, body, user }) =>
        dependencies.updateShelteredPerson.execute(user.id, params.id, body),
      {
        requireRole: ["INSTITUTION_ADMIN"],
        params: t.Object({ id: t.String({ format: "uuid" }) }),
        body: t.Intersect([
          t.Partial(t.Object(personData)),
          t.Object({ status: t.Optional(shelterStatus) }),
        ]),
        detail: { summary: "Atualiza dados ou status de uma pessoa acolhida" },
      },
    )
    .delete(
      "/:id",
      ({ params, user }) => dependencies.archiveShelteredPerson.execute(user.id, params.id),
      {
        requireRole: ["INSTITUTION_ADMIN"],
        params: t.Object({ id: t.String({ format: "uuid" }) }),
        detail: { summary: "Arquiva uma pessoa acolhida" },
      },
    )
    .post(
      "/:id/restore",
      ({ params, user }) => dependencies.restoreShelteredPerson.execute(user.id, params.id),
      {
        requireRole: ["INSTITUTION_ADMIN"],
        params: t.Object({ id: t.String({ format: "uuid" }) }),
        detail: { summary: "Restaura uma pessoa acolhida arquivada" },
      },
    );
}
