import { Elysia, t } from "elysia";
import { authPlugin } from "@/modules/auth/adapters/http/auth.plugin";
import type {
  DetectFace,
  FindFaceMatches,
} from "@/modules/matching/application/face-matching.use-cases";
import type { FaceImage } from "@/modules/matching/domain/face-matching";
import { BadRequestError } from "@/shared/errors/app-error";

export interface MatchingRoutesDependencies {
  detectFace: DetectFace;
  findFaceMatches: FindFaceMatches;
}

const acceptedImageTypes = ["image/jpeg", "image/png", "image/webp"] as const;

const imageBody = t.Object({
  image: t.File({
    maxSize: 10 * 1024 * 1024,
    type: [...acceptedImageTypes],
  }),
});

async function toFaceImage(file: File): Promise<FaceImage> {
  if (!acceptedImageTypes.includes(file.type as (typeof acceptedImageTypes)[number])) {
    throw new BadRequestError(
      "Formato de imagem não suportado. Envie JPG, JPEG, PNG ou WEBP.",
    );
  }

  return {
    buffer: Buffer.from(await file.arrayBuffer()),
    mimeType: file.type,
    filename: file.name,
  };
}

export function createMatchingRoutes(dependencies: MatchingRoutesDependencies) {
  return new Elysia({
    prefix: "/matching",
    tags: ["Reconhecimento facial"],
  })
    .use(authPlugin)
    .post(
      "/detect",
      async ({ body }) =>
        dependencies.detectFace.execute(await toFaceImage(body.image)),
      {
        auth: true,
        body: imageBody,
        detail: {
          summary: "Valida a imagem e detecta um rosto (RF-05)",
          description:
            "Retorna se há face detectável e a qualidade estimada da imagem.",
        },
      },
    )
    .post(
      "/search",
      async ({ body, query }) =>
        dependencies.findFaceMatches.execute({
          image: await toFaceImage(body.image),
          limit: query.limit,
          threshold: query.threshold,
        }),
      {
        auth: true,
        body: imageBody,
        query: t.Object({
          limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
          threshold: t.Optional(t.Numeric({ minimum: 0, maximum: 1 })),
        }),
        detail: {
          summary: "Busca por similaridade facial (RF-07 / RF-08)",
          description:
            "Envia a foto ao serviço Python e retorna candidatos ordenados por similaridade.",
        },
      },
    );
}
