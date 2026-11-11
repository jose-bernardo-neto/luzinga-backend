import { Elysia, t } from "elysia";
import { authPlugin } from "@/modules/auth/adapters/http/auth.plugin";
import type {
  DetectFace,
  FindFaceMatches,
} from "@/modules/matching/application/face-matching.use-cases";
import type { RegisterBiometricReferences } from "@/modules/matching/application/register-biometric-references";
import type { FaceImage } from "@/modules/matching/domain/face-matching";
import { BadRequestError } from "@/shared/errors/app-error";

export interface MatchingRoutesDependencies {
  detectFace: DetectFace;
  findFaceMatches: FindFaceMatches;
  registerBiometricReferences: RegisterBiometricReferences;
}

const acceptedImageTypes = ["image/jpeg", "image/png", "image/webp"] as const;

const imageBody = t.Object({
  image: t.File({
    maxSize: 10 * 1024 * 1024,
    type: [...acceptedImageTypes],
  }),
});

const searchImagesBody = t.Object({
  image: t.Optional(
    t.File({
      maxSize: 10 * 1024 * 1024,
      type: [...acceptedImageTypes],
    }),
  ),
  images: t.Optional(
    t.Files({
      minItems: 1,
      maxItems: 3,
      maxSize: 10 * 1024 * 1024,
      type: [...acceptedImageTypes],
    }),
  ),
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

async function toSearchImages(body: {
  image?: File;
  images?: File[];
}): Promise<FaceImage[]> {
  const files = [...(body.image ? [body.image] : []), ...(body.images ?? [])];

  if (files.length < 1 || files.length > 3) {
    throw new BadRequestError("Envie entre 1 e 3 fotos para a busca.");
  }

  return Promise.all(files.map(toFaceImage));
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
          images: await toSearchImages(body),
          limit: query.limit,
          threshold: query.threshold,
        }),
      {
        auth: true,
        body: searchImagesBody,
        query: t.Object({
          limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
          threshold: t.Optional(t.Numeric({ minimum: 0, maximum: 1 })),
        }),
        detail: {
          summary: "Busca por similaridade facial (RF-07 / RF-08)",
          description:
            "Aceita de 1 a 3 fotos de ângulos diferentes e ordena candidatos pela média das similaridades.",
        },
      },
    )
    .post(
      "/references/:ownerType/:ownerId",
      async ({ body, params, user }) =>
        dependencies.registerBiometricReferences.execute({
          ownerType: params.ownerType,
          ownerId: params.ownerId,
          actorId: user.id,
          images: await toSearchImages(body),
        }),
      {
        auth: true,
        params: t.Object({
          ownerType: t.Union([
            t.Literal("MISSING_PERSON"),
            t.Literal("SHELTERED_PERSON"),
          ]),
          ownerId: t.String({ format: "uuid" }),
        }),
        body: searchImagesBody,
        detail: {
          summary: "Cadastra referências biométricas",
          description:
            "Adiciona até três fotos por pessoa. Exige autoria da ficha ou instituição verificada responsável.",
        },
      },
    );
}
