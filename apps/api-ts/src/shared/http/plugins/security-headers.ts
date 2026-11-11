import { Elysia } from "elysia";
import { env } from "@/shared/config/env";

export const securityHeaders = new Elysia({ name: "security-headers" })
  .onRequest(({ set, request }) => {
    set.headers["x-content-type-options"] = "nosniff";
    set.headers["x-frame-options"] = "DENY";
    set.headers["referrer-policy"] = "no-referrer";
    set.headers["permissions-policy"] = "camera=(), microphone=(), geolocation=()";

    if (env.isProduction) {
      set.headers["strict-transport-security"] = "max-age=31536000; includeSubDomains";
    }

    const path = new URL(request.url).pathname;

    if (!path.startsWith("/docs")) {
      set.headers["content-security-policy"] = "default-src 'none'; frame-ancestors 'none'";
    }
  })
  .as("global");
