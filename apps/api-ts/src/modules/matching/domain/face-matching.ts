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
  embeddingDimensions: number | null;
}

export interface FaceMatchCandidate {
  biometricRecordId: string;
  ownerType: BiometricOwnerType;
  ownerId: string;
  similarity: number;
  imagePath: string | null;
  displayName: string | null;
  context: string | null;
}

export interface FaceMatchResult {
  candidates: FaceMatchCandidate[];
  processingMs: number;
  processedImages: number;
}

export interface FaceMatchOptions {
  limit: number;
  threshold: number;
}

export interface BiometricReferenceResult {
  biometricRecordId: string;
  ownerType: BiometricOwnerType;
  ownerId: string;
  imagePath: string;
  quality: number;
}

export interface BiometricEnrollmentResult {
  references: BiometricReferenceResult[];
  totalReferences: number;
}
