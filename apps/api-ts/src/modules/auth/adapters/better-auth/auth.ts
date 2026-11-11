import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError } from "better-auth/api";
import { ConsoleMailer } from "@/modules/auth/adapters/email/console-mailer";
import { isUserRole } from "@/modules/auth/domain/role";
import { env } from "@/shared/config/env";
import { prisma } from "@/shared/database/prisma";

const mailer = new ConsoleMailer();

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: env.CORS_ORIGINS,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    // US-02: invalida todas as sessões ativas após redefinir a senha.
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await mailer.send({
        to: user.email,
        subject: "Redefinição de senha — Plataforma Luzinga",
        text: [
          `Olá, ${user.name}.`,
          "",
          "Recebemos uma solicitação para redefinir a senha da sua conta.",
          `Acesse o link abaixo (válido por 30 minutos):`,
          url,
          "",
          "Se você não solicitou a alteração, ignore este e-mail.",
        ].join("\n"),
      });
    },
  },

  user: {
    additionalFields: {
      // US-01: o usuário escolhe o tipo de perfil no cadastro.
      // A validação do valor é feita no databaseHook abaixo.
      role: {
        type: "string",
        required: false,
        defaultValue: "CITIZEN",
        input: true,
      },
    },
  },

  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const role = (user as { role?: unknown }).role ?? "CITIZEN";

          if (!isUserRole(role)) {
            throw new APIError("BAD_REQUEST", {
              message: "Perfil de usuário inválido.",
            });
          }

          return {
            data: {
              ...user,
              role,
            },
          };
        },
      },
      update: {
        // O perfil só pode ser escolhido no cadastro. Sem este guard, o
        // endpoint update-user permitiria que um cidadão virasse admin.
        before: async (user) => {
          if (!("role" in user)) {
            return;
          }

          const { role: _ignored, ...data } = user;
          return { data };
        },
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },

  advanced: {
    database: {
      joins: true,
    },
  },
});
