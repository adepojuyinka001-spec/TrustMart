-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "BusinessStaffRole" AS ENUM ('OWNER', 'MANAGER', 'MEMBER');

-- CreateEnum
CREATE TYPE "ConfigValueType" AS ENUM ('STRING', 'NUMBER', 'BOOLEAN', 'JSON');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('MARKETING', 'DATA_PROCESSING', 'BUYER_CONTACT_SHARE');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'MORE_INFO_REQUIRED');

-- CreateEnum
CREATE TYPE "VerificationSubjectType" AS ENUM ('USER', 'BUSINESS');

-- CreateEnum
CREATE TYPE "AttributeDataType" AS ENUM ('STRING', 'NUMBER', 'BOOLEAN', 'ENUM', 'MULTI_ENUM');

-- CreateEnum
CREATE TYPE "ListingCondition" AS ENUM ('NEW', 'USED', 'REFURBISHED', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'CHECKING', 'ACTIVE', 'EXPIRING', 'EXPIRED', 'SOLD', 'REJECTED', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BuyerRequestStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'FULFILLED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RequirementType" AS ENUM ('HARD', 'PREFERRED');

-- CreateEnum
CREATE TYPE "RequirementOperator" AS ENUM ('EQUALS', 'NOT_EQUALS', 'GT', 'GTE', 'LT', 'LTE', 'IN', 'CONTAINS');

-- CreateEnum
CREATE TYPE "MatchTriggerReason" AS ENUM ('LISTING_CREATED', 'LISTING_ACTIVATED', 'LISTING_PRICE_CHANGED', 'BUYER_REQUEST_ACTIVATED', 'BUYER_REQUEST_UPDATED', 'MATCHING_PROFILE_CHANGED', 'MANUAL_RECALCULATION');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Business" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "registrationNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessStaff" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "BusinessStaffRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessStaff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformConfiguration" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "valueType" "ConfigValueType" NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "beforeState" JSONB,
    "afterState" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ConsentType" NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "grantedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Consent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppConsent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "optedIn" BOOLEAN NOT NULL DEFAULT false,
    "phone" TEXT,
    "optedInAt" TIMESTAMP(3),
    "optedOutAt" TIMESTAMP(3),

    CONSTRAINT "WhatsAppConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "whatsAppEnabled" BOOLEAN NOT NULL DEFAULT false,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationCase" (
    "id" TEXT NOT NULL,
    "subjectType" "VerificationSubjectType" NOT NULL,
    "userId" TEXT,
    "businessId" TEXT,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subcategory" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subcategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttributeDefinition" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "dataType" "AttributeDataType" NOT NULL,
    "unit" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttributeDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttributeOption" (
    "id" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AttributeOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryAttribute" (
    "id" TEXT NOT NULL,
    "subcategoryId" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "searchable" BOOLEAN NOT NULL DEFAULT true,
    "filterable" BOOLEAN NOT NULL DEFAULT true,
    "matchable" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CategoryAttribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "sellerUserId" TEXT NOT NULL,
    "businessId" TEXT,
    "subcategoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "askingPriceMinorUnits" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "negotiable" BOOLEAN NOT NULL DEFAULT false,
    "condition" "ListingCondition" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "country" TEXT,
    "state" TEXT,
    "city" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
    "moderationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "activatedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "soldAt" TIMESTAMP(3),

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingAttributeValue" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "ListingAttributeValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingPriceHistory" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "previousPriceMinorUnits" BIGINT NOT NULL,
    "newPriceMinorUnits" BIGINT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingPriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuyerRequest" (
    "id" TEXT NOT NULL,
    "buyerUserId" TEXT NOT NULL,
    "subcategoryId" TEXT NOT NULL,
    "minBudgetMinorUnits" BIGINT,
    "maxBudgetMinorUnits" BIGINT,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "preferredLocations" JSONB,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "timelineDays" INTEGER,
    "budgetFlexible" BOOLEAN NOT NULL DEFAULT false,
    "locationFlexible" BOOLEAN NOT NULL DEFAULT false,
    "status" "BuyerRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "activatedAt" TIMESTAMP(3),

    CONSTRAINT "BuyerRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuyerRequirement" (
    "id" TEXT NOT NULL,
    "buyerRequestId" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,
    "operator" "RequirementOperator" NOT NULL,
    "value" TEXT NOT NULL,
    "requirementType" "RequirementType" NOT NULL,
    "weightOverride" DOUBLE PRECISION,

    CONSTRAINT "BuyerRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchingProfile" (
    "id" TEXT NOT NULL,
    "subcategoryId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "thresholdOverridePercent" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchingCriterion" (
    "id" TEXT NOT NULL,
    "matchingProfileId" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,
    "defaultWeight" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "MatchingCriterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchRun" (
    "id" TEXT NOT NULL,
    "triggerReason" "MatchTriggerReason" NOT NULL,
    "listingId" TEXT,
    "buyerRequestId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "matchesCreated" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MatchRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "matchRunId" TEXT NOT NULL,
    "buyerRequestId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "matchingProfileId" TEXT,
    "thresholdUsedPercent" DOUBLE PRECISION NOT NULL,
    "scorePercent" DOUBLE PRECISION NOT NULL,
    "qualified" BOOLEAN NOT NULL,
    "hardFailed" BOOLEAN NOT NULL,
    "hardFailureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchCriterionResult" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "criterionKey" TEXT NOT NULL,
    "requirementType" "RequirementType" NOT NULL,
    "operator" "RequirementOperator",
    "buyerValue" TEXT,
    "listingValue" TEXT,
    "weight" DOUBLE PRECISION NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "criterionScorePercent" DOUBLE PRECISION,

    CONSTRAINT "MatchCriterionResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessStaff_businessId_userId_key" ON "BusinessStaff"("businessId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_key_key" ON "Role"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON "RolePermission"("roleId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_roleId_key" ON "UserRole"("userId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformConfiguration_key_key" ON "PlatformConfiguration"("key");

-- CreateIndex
CREATE INDEX "AuditEvent_resourceType_resourceId_idx" ON "AuditEvent"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "AuditEvent_actorId_idx" ON "AuditEvent"("actorId");

-- CreateIndex
CREATE UNIQUE INDEX "Consent_userId_type_key" ON "Consent"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppConsent_userId_key" ON "WhatsAppConsent"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_key_key" ON "Category"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Subcategory_categoryId_key_key" ON "Subcategory"("categoryId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "AttributeDefinition_key_key" ON "AttributeDefinition"("key");

-- CreateIndex
CREATE UNIQUE INDEX "AttributeOption_attributeId_value_key" ON "AttributeOption"("attributeId", "value");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryAttribute_subcategoryId_attributeId_key" ON "CategoryAttribute"("subcategoryId", "attributeId");

-- CreateIndex
CREATE INDEX "Listing_subcategoryId_status_idx" ON "Listing"("subcategoryId", "status");

-- CreateIndex
CREATE INDEX "Listing_sellerUserId_idx" ON "Listing"("sellerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ListingAttributeValue_listingId_attributeId_key" ON "ListingAttributeValue"("listingId", "attributeId");

-- CreateIndex
CREATE INDEX "BuyerRequest_subcategoryId_status_idx" ON "BuyerRequest"("subcategoryId", "status");

-- CreateIndex
CREATE INDEX "BuyerRequest_buyerUserId_idx" ON "BuyerRequest"("buyerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "BuyerRequirement_buyerRequestId_attributeId_key" ON "BuyerRequirement"("buyerRequestId", "attributeId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchingProfile_subcategoryId_version_key" ON "MatchingProfile"("subcategoryId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "MatchingCriterion_matchingProfileId_attributeId_key" ON "MatchingCriterion"("matchingProfileId", "attributeId");

-- CreateIndex
CREATE INDEX "Match_listingId_idx" ON "Match"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "Match_buyerRequestId_listingId_key" ON "Match"("buyerRequestId", "listingId");

-- CreateIndex
CREATE INDEX "MatchCriterionResult_matchId_idx" ON "MatchCriterionResult"("matchId");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessStaff" ADD CONSTRAINT "BusinessStaff_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessStaff" ADD CONSTRAINT "BusinessStaff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consent" ADD CONSTRAINT "Consent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppConsent" ADD CONSTRAINT "WhatsAppConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationCase" ADD CONSTRAINT "VerificationCase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationCase" ADD CONSTRAINT "VerificationCase_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subcategory" ADD CONSTRAINT "Subcategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributeOption" ADD CONSTRAINT "AttributeOption_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "AttributeDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryAttribute" ADD CONSTRAINT "CategoryAttribute_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "Subcategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryAttribute" ADD CONSTRAINT "CategoryAttribute_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "AttributeDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "Subcategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingAttributeValue" ADD CONSTRAINT "ListingAttributeValue_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingAttributeValue" ADD CONSTRAINT "ListingAttributeValue_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "AttributeDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingPriceHistory" ADD CONSTRAINT "ListingPriceHistory_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerRequest" ADD CONSTRAINT "BuyerRequest_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "Subcategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerRequirement" ADD CONSTRAINT "BuyerRequirement_buyerRequestId_fkey" FOREIGN KEY ("buyerRequestId") REFERENCES "BuyerRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerRequirement" ADD CONSTRAINT "BuyerRequirement_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "AttributeDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchingProfile" ADD CONSTRAINT "MatchingProfile_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "Subcategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchingCriterion" ADD CONSTRAINT "MatchingCriterion_matchingProfileId_fkey" FOREIGN KEY ("matchingProfileId") REFERENCES "MatchingProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchingCriterion" ADD CONSTRAINT "MatchingCriterion_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "AttributeDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_matchRunId_fkey" FOREIGN KEY ("matchRunId") REFERENCES "MatchRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_buyerRequestId_fkey" FOREIGN KEY ("buyerRequestId") REFERENCES "BuyerRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_matchingProfileId_fkey" FOREIGN KEY ("matchingProfileId") REFERENCES "MatchingProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchCriterionResult" ADD CONSTRAINT "MatchCriterionResult_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
