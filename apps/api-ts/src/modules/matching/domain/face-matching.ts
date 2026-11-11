import type { BiometricOwnerType } from "@luzinga/contracts";

export interface FaceImage {
  buffer: Buffer;
  mimeType: string;
  filename: string;
}

export interface FaceDetectionResult {
  faceDetected: boolean;
  quality: number | null;
  message: string | null;
}

export interface FaceMatchCandidate {
  biometricRecordId: string;
  ownerType: BiometricOwnerType;
  ownerId: string;
  similarity: number;
  imagePath: string | null;
}

export interface FaceMatchResult {
  candidates: FaceMatchCandidate[];
  processingMs: number;
}

export interface FaceMatchOptions {
  limit: number;
  threshold: number;
}
