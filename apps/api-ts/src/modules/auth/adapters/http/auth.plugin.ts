import type { UserRole } from "@luzinga/contracts";
import { Elysia } from "elysia";
import { auth } from "@/modules/auth/adapters/better-auth/auth";
import { isUserRole } from "@/modules/auth/domain/role";

function unauthorizedBody() {
  return {
    error: {
      code: "UNAUTHORIZED",
      message: "Sessão inválida ou expirada.",
    },
  };
}

function forbiddenBody() {
  return {
    error: {
      code: "FORBIDDEN",
      message: "Você não tem permissão para acessar este recurso.",
    },
  };
}

export const authPlugin = new Elysia({ name: "better-auth" })
  .mount(auth.handler)
  .macro({
    auth: {
      async resolve({ status, request: { headers } }) {
        const session = await auth.api.getSession({ headers });

        if (!session) {
          return status(401, unauthorizedBody());
        }

        return {
          user: session.user,
          session: session.session,
        };
      },
    },
    requireRole(roles: UserRole[]) {
      return {
        async resolve({ status, request: { headers } }) {
          const session = await auth.api.getSession({ headers });

          if (!session) {
            return status(401, unauthorizedBody());
          }

          const role = (session.user as { role?: unknown }).role;

          if (!isUserRole(role) || !roles.includes(role)) {
            return status(403, forbiddenBody());
          }

          return {
            user: session.user,
            session: session.session,
          };
        },
      };
    },
  });
