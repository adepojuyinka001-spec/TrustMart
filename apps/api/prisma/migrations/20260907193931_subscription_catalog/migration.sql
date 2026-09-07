-- CreateEnum
CREATE TYPE "BillingPeriod" AS ENUM ('NONE', 'WEEKLY', 'MONTHLY');

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "priceMinorUnits" BIGINT NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "billingPeriod" "BillingPeriod" NOT NULL DEFAULT 'NONE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionEntitlement" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "valueType" "ConfigValueType" NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionEntitlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlan_key_key" ON "SubscriptionPlan"("key");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionEntitlement_planId_key_key" ON "SubscriptionEntitlement"("planId", "key");

-- AddForeignKey
ALTER TABLE "SubscriptionEntitlement" ADD CONSTRAINT "SubscriptionEntitlement_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
