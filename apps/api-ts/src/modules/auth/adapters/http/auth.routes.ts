import { Elysia } from "elysia";
import { authPlugin } from "@/modules/auth/adapters/http/auth.plugin";

export const authRoutes = new Elysia({
  prefix: "/auth",
  tags: ["Autenticação"],
})
  .use(authPlugin)
  .get(
    "/me",
    ({ user, session }) => ({
      user,
      session,
    }),
    {
      auth: true,
      detail: {
        summary: "Retorna o usuário e a sessão atuais",
        description:
          "Os endpoints completos do Better Auth ficam montados em /api/auth/* (sign-up, sign-in, sign-out, request-password-reset, reset-password etc.).",
      },
    },
  );
