-- CreateEnum
CREATE TYPE "RiskCaseCategory" AS ENUM ('DUPLICATE_ACCOUNTS', 'SUSPICIOUS_PRICING');

-- CreateEnum
CREATE TYPE "RiskCaseStatus" AS ENUM ('OPEN', 'DISMISSED', 'ACTIONED');

-- CreateTable
CREATE TABLE "RiskCase" (
    "id" TEXT NOT NULL,
    "category" "RiskCaseCategory" NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "RiskCaseStatus" NOT NULL DEFAULT 'OPEN',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskCase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RiskCase_status_idx" ON "RiskCase"("status");

-- CreateIndex
CREATE INDEX "RiskCase_category_subjectType_subjectId_idx" ON "RiskCase"("category", "subjectType", "subjectId");

