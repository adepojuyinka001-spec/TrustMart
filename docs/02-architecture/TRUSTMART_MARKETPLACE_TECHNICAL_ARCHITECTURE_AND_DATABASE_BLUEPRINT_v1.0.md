# TRUSTMART MARKETPLACE TECHNICAL ARCHITECTURE & DATABASE BLUEPRINT v1.0

Status: Current Technical Design Candidate
Date: 22 August 2026

## 1. Purpose
Translate the approved TrustMart Marketplace business model into an implementation-ready architecture integrated with the TrustMart core and standalone Escrow.

Marketplace is not a separate platform/database.

## 2. Shared Core
- Identity
- User/Profile
- Business/Staff
- RBAC
- KYC/KYB
- Platform Configuration
- Consent/Privacy
- Notifications
- TrustGuard
- Analytics Events
- Audit
- Files/Media

## 3. Marketplace Modules
- Category Engine
- Dynamic Attribute Engine
- Listing Engine
- Buyer Request Engine
- Matching Engine
- Search
- Saved Listings
- Interest
- Contact Consent / Access
- Lead Engine
- Subscription Engine
- Listing Lifecycle
- Price History
- Re-engagement
- Marketplace Analytics

## 4. Transaction Assurance Modules
- Escrow
- Versioned Transaction Terms
- Fee Allocation
- Payments / Virtual Accounts
- Ledger
- Release
- Refund
- Disputes
- Rewards
- Referrals
- Reviews / Customer Experience

## 5. Core database entities

### Identity / Organization
User, Profile, Business, BusinessStaff, ExternalIdentity, Role, Permission, UserRole, VerificationCase.

### Marketplace Configuration
Category, Subcategory, AttributeDefinition, AttributeOption, CategoryAttribute, MatchingProfile, MatchingCriterion, PlatformConfiguration.

### Seller Inventory
Listing, ListingAttributeValue, ListingMedia, ListingDocument, ListingPriceHistory, ListingLifecycleEvent, ListingModerationCase.

### Buyer Demand
BuyerRequest, BuyerRequirement, BuyerRequestLocation, BuyerRequestLifecycleEvent.

### Matching
MatchRun, Match, MatchCriterionResult, MatchNotification.

### Engagement
SavedListing, Interest, ContactConsent, ContactAccessGrant, Lead, LeadActivity.

### Subscription
SubscriptionPlan, SubscriptionEntitlement, Subscription, SubscriptionPayment, SubscriptionEvent.

### Escrow
EscrowTransaction, EscrowParty, EscrowTermVersion, EscrowAcceptance, EscrowCondition, EscrowFeeAllocation, EscrowEvent.

### Finance
PaymentAccountAssignment, PaymentRecord, WebhookEvent, LedgerAccount, LedgerJournal, LedgerEntry, LedgerExternalReference, ReconciliationException.

### Referral / Reward
ReferralRelationship, RewardPolicyVersion, RewardRecord, RewardWallet, RewardWithdrawal.

### Reviews
ReviewRequest, ReviewReminder, ServiceReview, ServiceRecoveryCase, ReputationReview (future).

### Communication / Support
NotificationRecord, NotificationPreference, Consent, WhatsAppConsent, SupportCase, SupportMessage.

### Risk / Audit
RiskCase, RiskSignal, FraudSignal, Report, AuditEvent.

## 6. Category / Dynamic Attribute Engine
Architecture:
Category → Subcategory → Dynamic Attributes.

Admin-configurable attribute metadata:
- key;
- label;
- data type;
- required/optional;
- searchable;
- filterable;
- matchable;
- public/private;
- unit;
- allowed options;
- validation;
- display order.

Do not hard-code separate applications for each industry.

Use first-class universal fields plus dynamic category-specific attributes.

## 7. Listing Engine
Universal fields should include:
- seller / owning business;
- category/subcategory;
- title;
- description;
- asking price in minor units;
- currency;
- negotiable;
- condition;
- general location;
- quantity;
- availability;
- status;
- verification references;
- createdAt;
- activatedAt;
- expiresAt;
- soldAt.

Dynamic values live in structured category attribute storage.

Sensitive ownership/business documents are not public by default.

## 8. Buyer Request Engine
Universal:
- buyer;
- category/subcategory;
- minimum/maximum budget;
- currency;
- preferred locations;
- quantity;
- timeline;
- budget flexibility;
- location flexibility;
- notification preference;
- status.

Requirements:
- attribute;
- operator;
- value;
- HARD or PREFERRED;
- optional weight override;
- flexibility metadata.

Natural-language AI parser creates a DRAFT only. Buyer confirms before activation.

## 9. Matching Engine
Pipeline:
1. select active buyer request and active listing;
2. category/subcategory compatibility;
3. hard requirement checks;
4. weighted criterion scoring;
5. threshold evaluation;
6. persist score and criterion results;
7. classify;
8. emit MatchCreated;
9. notify buyer.

Store:
- score;
- threshold used;
- matching profile/version;
- qualified flag;
- hard-failure reason;
- criterion-level result;
- explanation inputs;
- creation/recalculation metadata.

Initial default threshold: 70%, configurable.

Recalculate on:
- new/updated listing;
- new/updated buyer request;
- price change;
- matching-profile change;
- renewal/reactivation;
- buyer flexibility change.

## 10. Interest / Contact Access
Buyer clicks **I'm Interested**:
1. create Interest;
2. create/update Lead;
3. notify seller;
4. evaluate subscription/entitlement;
5. evaluate buyer consent/contact preference;
6. permit reveal or controlled introduction only when allowed;
7. audit access.

Seller subscription alone is insufficient to reveal buyer contact.

## 11. Subscription Engine
Use Plan + Entitlements, not plan-name conditionals.

Initial configurable commercial defaults:
- weekly ₦5,000;
- monthly ₦15,000.

Entitlements may control:
- active listings;
- lead/contact access;
- staff;
- analytics;
- CRM;
- bulk upload;
- API;
- featured/priority options.

Activation only after verified subscription payment.

## 12. Listing Lifecycle
Initial configurable cycle: 14 days.

Recommended statuses:
DRAFT → SUBMITTED → CHECKING → ACTIVE → EXPIRING → EXPIRED

Additional:
SOLD, REJECTED, SUSPENDED, ARCHIVED.

Pre-expiry automation asks SOLD / STILL AVAILABLE.

SOLD stops matching.

STILL AVAILABLE can renew.

## 13. Lead Engine
Statuses:
NEW → VIEWED → CONTACTED → INSPECTION_SCHEDULED → NEGOTIATING → TRANSACTION_STARTED → WON / LOST.
SPAM_FRAUD via controlled moderation/risk process.

NEGOTIATING and TRANSACTION_STARTED are strong Escrow recommendation moments.

## 14. Optional Marketplace-to-Escrow Handoff
Marketplace does not require Escrow.

CTA:
**Secure This Deal With TrustMart Escrow**

Handoff may prefill:
- buyer;
- seller;
- listing;
- permitted product details;
- agreed offer if available;
- proposed amount.

This creates an Escrow DRAFT only.

Parties must confirm final Escrow terms.

## 15. Standalone Escrow
Escrow is independent.

Suggested origin enum:
DIRECT, MARKETPLACE, PARTNER, BUSINESS_API.

Marketplace references are nullable.

## 16. Escrow Fee Allocation
Store:
- fee policy version;
- fee rate configuration reference;
- buyer share;
- seller share;
- calculated fee obligation;
- term-version acceptance.

Current contemplated fee: 2.5%, configurable.

## 17. Confidential Reward Architecture
`RewardPolicyVersion` stores internal rules.

Customer/referrer APIs return:
- earned amount;
- type;
- status;
- date;
- transaction reference.

They do not return internal rates or formulas.

Only authorized staff may view policy percentage fields.

## 18. Service Review Engine
After eligible Escrow completion:
- schedule buyer and seller review request;
- deliver in-app, email and approved/consented WhatsApp;
- configurable reminders;
- overall rating;
- written feedback;
- optional service dimensions;
- service-recovery case for low rating.

## 19. Search
Manual search complements matching:
- keyword;
- category;
- location;
- price;
- attributes;
- verification;
- recency;
- availability.

Use PostgreSQL capabilities first. Defer dedicated search infrastructure until evidence requires it.

## 20. Geolocation
Store structured location at appropriate precision:
- country;
- state;
- city;
- neighbourhood;
- coordinates where appropriate;
- public precision level.

Never expose exact seller/property address automatically.

## 21. Marketplace Events
Examples:
- MarketplaceListingCreated
- MarketplaceListingActivated
- MarketplaceListingPriceReduced
- MarketplaceListingExpiring
- MarketplaceListingExpired
- MarketplaceBuyerRequestActivated
- MarketplaceMatchCreated
- MarketplaceInterestCreated
- MarketplaceContactAccessGranted
- MarketplaceLeadStatusChanged
- SubscriptionActivated
- SubscriptionExpiring
- SubscriptionExpired
- EscrowDraftCreatedFromMarketplace
- EscrowCompleted
- RewardEligibilityReady
- RewardAvailable
- ReviewRequestScheduled
- ServiceReviewSubmitted

## 22. Event Architecture
Use backend domain events and a transactional outbox where durable delivery is needed.

n8n consumes safe events/APIs.

Do not make n8n the authoritative matching, payment, ledger or Escrow state engine.

## 23. Admin Configuration
Admin-configurable:
- category tree;
- dynamic attributes;
- thresholds;
- weights;
- listing duration;
- subscription plans/pricing;
- entitlements;
- reminder intervals;
- feature flags;
- moderation settings.

Restricted internal roles control confidential reward/referral policy.

## 24. Security boundaries
- server-side RBAC;
- resource-level authorization;
- contact-access audit;
- buyer budgets treated as sensitive;
- upload validation;
- moderation/reporting;
- rate limiting;
- no financial DB writes from n8n;
- no AI financial authority;
- confidential reward policy server-side only.

## 25. Marketplace MVP acceptance
- seller creates valid listing;
- buyer creates structured request;
- hard requirements work;
- weighted score is reproducible;
- configurable threshold works;
- buyer receives qualified match;
- buyer expresses interest;
- seller receives lead;
- contact reveal respects entitlement + consent;
- subscription activates only after verified payment;
- listing expires/renews by configuration;
- price change triggers re-match;
- parties may connect without Escrow;
- Escrow demo/CTA appears appropriately;
- optional handoff creates DRAFT and requires term confirmation;
- customer APIs never expose confidential reward/referral rates.
