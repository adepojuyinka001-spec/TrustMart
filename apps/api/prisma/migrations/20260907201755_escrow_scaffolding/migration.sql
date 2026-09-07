-- CreateEnum
CREATE TYPE "EscrowOriginType" AS ENUM ('DIRECT', 'MARKETPLACE', 'PARTNER', 'BUSINESS_API');

-- CreateEnum
CREATE TYPE "EscrowStatus" AS ENUM ('DRAFT', 'TERMS_PROPOSED', 'ACCEPTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EscrowPartyRole" AS ENUM ('BUYER', 'SELLER');

-- CreateEnum
CREATE TYPE "EscrowPartyStatus" AS ENUM ('INVITED', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "EscrowFeeAllocation" AS ENUM ('BUYER_PAYS', 'SELLER_PAYS', 'SHARED');

-- CreateTable
CREATE TABLE "EscrowTransaction" (
    "id" TEXT NOT NULL,
    "originType" "EscrowOriginType" NOT NULL,
    "originListingId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "status" "EscrowStatus" NOT NULL DEFAULT 'DRAFT',
    "activeTermVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,

    CONSTRAINT "EscrowTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscrowParty" (
    "id" TEXT NOT NULL,
    "escrowId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "EscrowPartyRole" NOT NULL,
    "status" "EscrowPartyStatus" NOT NULL DEFAULT 'INVITED',
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "EscrowParty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscrowTermVersion" (
    "id" TEXT NOT NULL,
    "escrowId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "transactionAmountMinorUnits" BIGINT NOT NULL,
    "feePercent" DOUBLE PRECISION NOT NULL,
    "feeAllocation" "EscrowFeeAllocation" NOT NULL,
    "buyerFeeSharePercent" DOUBLE PRECISION,
    "proposedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EscrowTermVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscrowCondition" (
    "id" TEXT NOT NULL,
    "termVersionId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EscrowCondition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscrowAcceptance" (
    "id" TEXT NOT NULL,
    "termVersionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EscrowAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EscrowTransaction_createdByUserId_idx" ON "EscrowTransaction"("createdByUserId");

-- CreateIndex
CREATE INDEX "EscrowParty_userId_idx" ON "EscrowParty"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EscrowParty_escrowId_userId_key" ON "EscrowParty"("escrowId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "EscrowTermVersion_escrowId_version_key" ON "EscrowTermVersion"("escrowId", "version");

-- CreateIndex
CREATE INDEX "EscrowCondition_termVersionId_idx" ON "EscrowCondition"("termVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "EscrowAcceptance_termVersionId_userId_key" ON "EscrowAcceptance"("termVersionId", "userId");

-- AddForeignKey
ALTER TABLE "EscrowParty" ADD CONSTRAINT "EscrowParty_escrowId_fkey" FOREIGN KEY ("escrowId") REFERENCES "EscrowTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscrowTermVersion" ADD CONSTRAINT "EscrowTermVersion_escrowId_fkey" FOREIGN KEY ("escrowId") REFERENCES "EscrowTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscrowCondition" ADD CONSTRAINT "EscrowCondition_termVersionId_fkey" FOREIGN KEY ("termVersionId") REFERENCES "EscrowTermVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscrowAcceptance" ADD CONSTRAINT "EscrowAcceptance_termVersionId_fkey" FOREIGN KEY ("termVersionId") REFERENCES "EscrowTermVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
