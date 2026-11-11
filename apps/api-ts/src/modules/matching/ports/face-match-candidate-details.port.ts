import type { FaceMatchCandidate } from "@/modules/matching/domain/face-matching";

export interface FaceMatchCandidateDetailsPort {
  enrich(candidates: FaceMatchCandidate[]): Promise<FaceMatchCandidate[]>;
}
