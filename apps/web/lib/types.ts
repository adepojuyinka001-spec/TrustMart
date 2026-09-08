// Loose client-side types mirroring the API's actual response shapes. Not generated from
// the OpenAPI spec (see /api-docs on the API for the authoritative contract) — kept
// minimal and widened with [key: string]: unknown where the UI doesn't need every field.

export interface Profile {
  firstName: string;
  lastName: string;
}

export interface AuthUser {
  id: string;
  email: string;
  status: string;
  referralCode: string | null;
  profile?: Profile;
  // UX convenience only — every admin endpoint still independently enforces its own
  // permission server-side. Never treat this as an authorization decision on its own.
  permissions?: string[];
}

export interface AttributeOption {
  id: string;
  value: string;
  label: string;
}

export interface AttributeDefinition {
  id: string;
  key: string;
  label: string;
  dataType: "STRING" | "NUMBER" | "BOOLEAN" | "ENUM" | "MULTI_ENUM";
  unit?: string | null;
  options?: AttributeOption[];
}

export interface CategoryAttribute {
  id: string;
  required: boolean;
  searchable?: boolean;
  filterable?: boolean;
  matchable?: boolean;
  attribute: AttributeDefinition;
}

export interface Subcategory {
  id: string;
  key: string;
  label: string;
}

export interface Category {
  id: string;
  key: string;
  label: string;
  subcategories: Subcategory[];
}

export interface SubcategoryDetail {
  id: string;
  key: string;
  label: string;
  category: { id: string; key: string; label: string };
  attributes: CategoryAttribute[];
}

export interface Listing {
  id: string;
  sellerUserId: string;
  title: string;
  description: string;
  askingPriceMinorUnits: string;
  currency: string;
  negotiable: boolean;
  condition: string;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  status: string;
  createdAt?: string;
  moderationReason?: string | null;
  subcategory?: { id: string; label: string; category?: { label: string } };
  attributeValues?: { attributeId: string; value: string; attribute?: AttributeDefinition }[];
}

export interface BuyerRequirement {
  attributeId: string;
  operator: string;
  value: string;
  requirementType: "HARD" | "PREFERRED";
}

export interface BuyerRequest {
  id: string;
  subcategoryId: string;
  minBudgetMinorUnits: string | null;
  maxBudgetMinorUnits: string | null;
  currency: string;
  preferredLocations: string[];
  status: string;
  requirements?: BuyerRequirement[];
  subcategory?: { id: string; label: string; category?: { label: string } };
}

export interface Match {
  id: string;
  listingId: string;
  buyerRequestId: string;
  scorePercent: number;
  qualified: boolean;
  hardFailed: boolean;
  classification: "EXCELLENT" | "STRONG" | "GOOD" | "ALTERNATIVE";
  listing?: Listing;
}

export interface Interest {
  id: string;
  listingId: string;
  message?: string | null;
  createdAt: string;
  listing?: Listing;
  lead?: Lead;
}

export interface Lead {
  id: string;
  buyerUserId: string;
  sellerUserId: string;
  listingId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  activities?: { id: string; toStatus: string; note?: string | null; createdAt: string }[];
}

export interface EscrowParty {
  id: string;
  userId: string;
  role: "BUYER" | "SELLER";
  status: "INVITED" | "ACCEPTED" | "DECLINED";
}

export interface EscrowTermVersion {
  id: string;
  version: number;
  transactionAmountMinorUnits: string;
  feePercent: number;
  feeAllocation: "BUYER_PAYS" | "SELLER_PAYS" | "SHARED";
  buyerFeeSharePercent?: number | null;
  conditions: { id: string; description: string }[];
  acceptances: { userId: string }[];
}

export interface Escrow {
  id: string;
  title: string;
  description?: string | null;
  currency: string;
  status: "DRAFT" | "TERMS_PROPOSED" | "ACCEPTED" | "CANCELLED";
  originType: string;
  parties: EscrowParty[];
  termVersions: EscrowTermVersion[];
  createdAt: string;
}

export interface AnalyticsOverview {
  users: { total: number };
  listings: { byStatus: Record<string, number> };
  buyerRequests: { byStatus: Record<string, number> };
  matching: { totalRuns: number; qualified: number; qualificationRate: number | null };
  interests: { total: number };
  leads: { byStatus: Record<string, number> };
  escrows: { byStatus: Record<string, number> };
  subscriptions: { activePlans: number };
  referrals: { byType: Record<string, number> };
}

export interface AuditEvent {
  id: string;
  actorId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface SubscriptionPlan {
  id: string;
  key: string;
  label: string;
  description?: string | null;
  priceMinorUnits: string;
  currency: string;
  billingPeriod: "NONE" | "WEEKLY" | "MONTHLY";
  entitlements: { key: string; value: string }[];
}
