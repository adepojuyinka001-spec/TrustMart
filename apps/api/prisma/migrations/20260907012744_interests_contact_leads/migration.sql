-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'VIEWED', 'CONTACTED', 'INSPECTION_SCHEDULED', 'NEGOTIATING', 'TRANSACTION_STARTED', 'WON', 'LOST', 'SPAM_FRAUD');

-- CreateTable
CREATE TABLE "SavedListing" (
    "id" TEXT NOT NULL,
    "buyerUserId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interest" (
    "id" TEXT NOT NULL,
    "buyerUserId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "matchId" TEXT,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Interest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "interestId" TEXT NOT NULL,
    "buyerUserId" TEXT NOT NULL,
    "sellerUserId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadActivity" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "fromStatus" "LeadStatus",
    "toStatus" "LeadStatus" NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactAccessGrant" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "sellerUserId" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "denialReason" TEXT,
    "channel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactAccessGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SavedListing_buyerUserId_listingId_key" ON "SavedListing"("buyerUserId", "listingId");

-- CreateIndex
CREATE INDEX "Interest_listingId_idx" ON "Interest"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "Interest_buyerUserId_listingId_key" ON "Interest"("buyerUserId", "listingId");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_interestId_key" ON "Lead"("interestId");

-- CreateIndex
CREATE INDEX "Lead_sellerUserId_status_idx" ON "Lead"("sellerUserId", "status");

-- CreateIndex
CREATE INDEX "Lead_buyerUserId_idx" ON "Lead"("buyerUserId");

-- CreateIndex
CREATE INDEX "LeadActivity_leadId_idx" ON "LeadActivity"("leadId");

-- CreateIndex
CREATE INDEX "ContactAccessGrant_leadId_idx" ON "ContactAccessGrant"("leadId");

-- AddForeignKey
ALTER TABLE "SavedListing" ADD CONSTRAINT "SavedListing_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interest" ADD CONSTRAINT "Interest_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interest" ADD CONSTRAINT "Interest_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_interestId_fkey" FOREIGN KEY ("interestId") REFERENCES "Interest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactAccessGrant" ADD CONSTRAINT "ContactAccessGrant_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
