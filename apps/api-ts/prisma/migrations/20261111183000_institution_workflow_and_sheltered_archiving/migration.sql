ALTER TYPE "UserRole" ADD VALUE 'PLATFORM_ADMIN';

CREATE TYPE "InstitutionStatus" AS ENUM (
    'PENDING',
    'VERIFIED',
    'SUSPENDED',
    'REJECTED'
);

ALTER TABLE "institution"
ADD COLUMN "status" "InstitutionStatus" NOT NULL DEFAULT 'PENDING';

UPDATE "institution"
SET "status" = CASE
    WHEN "verifiedStatus" = true THEN 'VERIFIED'::"InstitutionStatus"
    ELSE 'PENDING'::"InstitutionStatus"
END;

ALTER TABLE "institution" DROP COLUMN "verifiedStatus";

ALTER TABLE "sheltered_person" ADD COLUMN "archivedAt" TIMESTAMP(3);
CREATE INDEX "sheltered_person_archivedAt_idx" ON "sheltered_person"("archivedAt");
