import type { PrismaClient } from "@/generated/prisma/client";
import type { FaceMatchCandidate } from "@/modules/matching/domain/face-matching";
import type { FaceMatchCandidateDetailsPort } from "@/modules/matching/ports/face-match-candidate-details.port";

export class PrismaFaceMatchCandidateDetails
  implements FaceMatchCandidateDetailsPort
{
  constructor(private readonly prisma: PrismaClient) {}

  async enrich(candidates: FaceMatchCandidate[]): Promise<FaceMatchCandidate[]> {
    const missingIds = candidates
      .filter((item) => item.ownerType === "MISSING_PERSON")
      .map((item) => item.ownerId);
    const shelteredIds = candidates
      .filter((item) => item.ownerType === "SHELTERED_PERSON")
      .map((item) => item.ownerId);

    const [reports, shelteredPeople] = await Promise.all([
      this.prisma.missingPersonReport.findMany({
        where: { id: { in: missingIds } },
        select: { id: true, fullName: true, lastSeenAddress: true },
      }),
      this.prisma.shelteredPerson.findMany({
        where: { id: { in: shelteredIds }, archivedAt: null },
        select: {
          id: true,
          fullName: true,
          foundLocation: true,
          institution: { select: { name: true } },
        },
      }),
    ]);

    const reportById = new Map(reports.map((item) => [item.id, item]));
    const shelteredById = new Map(shelteredPeople.map((item) => [item.id, item]));

    return candidates.map((candidate) => {
      if (candidate.ownerType === "MISSING_PERSON") {
        const report = reportById.get(candidate.ownerId);
        return {
          ...candidate,
          displayName: report?.fullName ?? null,
          context: report?.lastSeenAddress
            ? `Último local informado: ${report.lastSeenAddress}`
            : "Ficha de pessoa desaparecida",
        };
      }

      const person = shelteredById.get(candidate.ownerId);
      return {
        ...candidate,
        displayName: person?.fullName ?? null,
        context: person
          ? [person.institution.name, person.foundLocation].filter(Boolean).join(" · ")
          : null,
      };
    });
  }
}
