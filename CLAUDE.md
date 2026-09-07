# CLAUDE.md --- TRUSTMART LIMITED

**Project:** TrustMart\
**Company:** TrustMart Limited\
**Product:** Marketplace \| Escrow\
**Official Tagline:** Find. Secure. Transact.\
**Corporate Promise:** Securing Transactions. Building Trust.\
**Status:** Authoritative Claude Code project instructions\
**Master Specification:**
`docs/00-ssot/TrustMart_Comprehensive_Master_Project_Document_v5.0_Claude_Code.pdf`
**Last Updated:** 7 September 2026

------------------------------------------------------------------------

## 1. YOUR ROLE

You are the principal implementation agent for the TrustMart platform.

Your responsibility is to build TrustMart accurately, securely,
incrementally, and in accordance with the approved Master Project
Document.

You are not authorized to redesign the business model, invent financial
rules, weaken security controls, select unapproved production providers,
or silently resolve conflicts in specifications.

For every material task:

**READ → PLAN → APPROVE → IMPLEMENT → REVIEW MIGRATION → TEST →
ADVERSARIAL REVIEW → UPDATE PROJECT RECORDS → COMMIT → NEXT**

Do not attempt to build the entire platform in one task.

------------------------------------------------------------------------

## 2. SOURCE OF TRUTH

Before making architectural, financial, Marketplace, Escrow, security,
automation, database, API, or product changes:

1.  Read this `CLAUDE.md`.
2.  Read the current **TrustMart Comprehensive Master Project Document
    v5.0** (`docs/00-ssot/TrustMart_Comprehensive_Master_Project_Document_v5.0_Claude_Code.pdf`).
3.  Read `docs/00-ssot/IMPLEMENTATION_STATUS.md`, `docs/00-ssot/DECISION_LOG.md`,
    `docs/00-ssot/RISK_REGISTER.md`, `docs/00-ssot/OPEN_DECISIONS.md`,
    `docs/00-ssot/MASTER_DOCUMENT_REGISTER.md`, and relevant current specifications if present.
4.  Inspect existing code, Prisma schema, migrations, tests, APIs,
    workflows, and configuration.
5.  Identify conflicts before editing.

### Authority order

When sources conflict, use this priority:

1.  Applicable confirmed law/regulatory requirement.
2.  TrustMart Comprehensive Master Project Document v5.0.
3.  Explicit later founder-approved written decisions.
4.  Approved legal/compliance decisions.
5.  Approved financial/security specifications.
6.  Current architecture/database/API specifications.
7.  Current UI/UX specifications.
8.  Current automation specifications.
9.  Existing code.
10. Developer assumptions.
11. AI suggestions.

Never silently preserve outdated behaviour because it already exists in
code.

Never silently delete historical specifications. Mark or move superseded
material appropriately.

------------------------------------------------------------------------

## 3. PRODUCT DEFINITION

TrustMart is one integrated **Trust & Commerce Network** with two
sibling products:

### A. TrustMart Marketplace

Marketplace is responsible for:

-   seller listings and inventory;
-   structured buyer requests and purchase intent;
-   categories and dynamic attributes;
-   manual search;
-   deterministic matching;
-   interests;
-   saved listings;
-   leads;
-   seller/business subscriptions;
-   contact-access entitlements;
-   listing lifecycle;
-   price history;
-   re-engagement;
-   Marketplace analytics;
-   future controlled messaging, CRM, business tools, APIs and
    intelligence.

### B. TrustMart Escrow / Transaction Assurance

Escrow is a standalone core TrustMart product.

It can secure eligible transactions originating from:

-   TrustMart Marketplace;
-   WhatsApp;
-   social media;
-   another marketplace;
-   physical/offline transactions;
-   direct business relationships;
-   referrals;
-   partners;
-   future business/API integrations.

### Non-negotiable architecture rule

> **Marketplace may feed Escrow, but Escrow must never depend on
> Marketplace.**

Do not create separate MarketplaceEscrow and StandaloneEscrow engines.

Use one Escrow Engine with an origin such as:

-   `MARKETPLACE`
-   `DIRECT`
-   `PARTNER`
-   `BUSINESS_API`

Marketplace-specific references are optional/nullable.

------------------------------------------------------------------------

## 4. MARKETPLACE ESCROW IS OPTIONAL

TrustMart Marketplace must **not force buyers or sellers to use
Escrow**.

After buyer and seller connect, they may:

1.  complete their transaction directly/off-platform; or
2.  voluntarily use TrustMart Escrow.

TrustMart should recommend Escrow at appropriate commercial moments.

Preferred CTA:

> **Secure This Deal With TrustMart Escrow**

Marketplace-to-Escrow handoff may prefill permitted data, but it creates
an **Escrow DRAFT only**.

Both parties must explicitly agree to the actual transaction terms.

Never silently convert Marketplace listing/request data into binding
Escrow terms.

------------------------------------------------------------------------

## 5. BRAND IDENTITY --- LOCKED

Use the approved TrustMart identity consistently.

### Brand

-   Company: **TrustMart Limited**
-   Brand: **TrustMart**
-   Descriptor: **Marketplace \| Escrow**
-   Official short tagline: **Find. Secure. Transact.**
-   Corporate promise: **Securing Transactions. Building Trust.**

### Colours

-   Deep Navy: `#0B2C5F`
-   Gold: `#D4A017`
-   White: `#FFFFFF`
-   Dark Accent: `#1A1A1A`

### Typography

Brand standard:

-   Montserrat Bold
-   Montserrat

Use an appropriate clean sans-serif fallback in application environments
where Montserrat is unavailable.

### Logo system

The approved visual identity uses:

-   shield;
-   TM monogram;
-   handshake/trust motif;
-   navy and gold.

Required variations include:

-   primary full-colour logo;
-   app/social icon;
-   monochrome logo;
-   horizontal/reversed variants where necessary.

### Retired wording

Do not use the old escrow-only tagline:

> `We Hold. You Trust. We Deliver.`

unless explicitly referencing historical material.

The current tagline is:

> **Find. Secure. Transact.**

Do not alter the brand based on old mockups or third-party assets
without explicit founder approval.

------------------------------------------------------------------------

## 6. MARKETPLACE CATEGORY ENGINE

Use:

**Category → Subcategory → Dynamic Attributes**

Do not build separate hard-coded applications for Real Estate, Vehicles,
Travel, etc.

Initial priority categories:

1.  Real Estate
2.  Vehicles
3.  Travel / selected high-value services
4.  Import/export and trade
5.  broader legitimate categories later

Dynamic attribute definitions should support metadata such as:

-   key;
-   label;
-   data type;
-   required;
-   searchable;
-   filterable;
-   matchable;
-   public/private;
-   unit;
-   allowed options;
-   validation;
-   display order.

Use first-class universal fields plus structured dynamic
category-specific values.

Avoid opaque JSON for fields that are important for search, matching,
authorization, reporting, or analytics.

------------------------------------------------------------------------

## 7. BUYER REQUESTS

Buyer requests may contain:

-   category/subcategory;
-   budget range;
-   currency;
-   locations;
-   quantity;
-   timeline;
-   hard requirements;
-   preferred requirements;
-   budget flexibility;
-   location flexibility;
-   notification preferences.

Requirements must distinguish:

-   `HARD`
-   `PREFERRED`

AI may convert natural-language buyer input into a structured **DRAFT**.

The buyer must review and confirm the interpretation before activation.

AI interpretation is never automatically authoritative.

------------------------------------------------------------------------

## 8. LISTINGS

Seller listings should support:

-   seller/business;
-   category/subcategory;
-   title;
-   description;
-   price;
-   currency;
-   negotiable flag;
-   condition;
-   general location;
-   quantity;
-   availability;
-   dynamic attributes;
-   media;
-   permitted verification references;
-   lifecycle status;
-   activation/expiry/sold timestamps.

Sensitive documents and exact addresses are private by default.

------------------------------------------------------------------------

## 9. MATCHING ENGINE

The authoritative matching engine must be **deterministic backend
application logic**.

AI may explain a match.

n8n may notify users about a match.

Neither AI nor n8n calculates the authoritative score.

### Matching sequence

1.  Validate active buyer request and active listing.
2.  Check category/subcategory compatibility.
3.  Evaluate hard requirements.
4.  Disqualify failed hard requirements where applicable.
5.  Evaluate weighted criteria.
6.  Calculate normalized score.
7.  Apply configured threshold.
8.  Persist criterion-level results.
9.  Persist matching profile/version.
10. Classify the result.
11. Emit domain event.
12. Notify according to user preferences.

### Initial default threshold

`70%`

This is configurable.

Do not hard-code it.

Initial classifications may be:

-   90--100: Excellent
-   80--89: Strong
-   70--79: Good
-   below 70: Alternative

These are configurable.

Alternative matches must be clearly labelled.

### Example Real Estate weights

-   Location: 25%
-   Budget: 25%
-   Property type: 15%
-   Bedrooms: 10%
-   Land size: 10%
-   Title: 10%
-   Preferences: 5%

These are examples/configuration, not permanent hard-coded rules.

------------------------------------------------------------------------

## 10. LISTING LIFECYCLE

Initial default active listing duration:

`14 days`

This is configurable.

Recommended lifecycle:

`DRAFT → SUBMITTED → CHECKING → ACTIVE → EXPIRING → EXPIRED`

Additional controlled states:

-   SOLD
-   REJECTED
-   SUSPENDED
-   ARCHIVED

Before expiry, ask:

-   SOLD
-   STILL AVAILABLE

If SOLD:

-   stop matching;
-   record outcome;
-   ask whether TrustMart facilitated the deal where appropriate.

If STILL AVAILABLE:

-   renew/reactivate according to policy.

Price reductions must be stored in price history and may trigger:

-   re-matching;
-   notifications to prior interested buyers;
-   notifications to newly qualifying buyers.

------------------------------------------------------------------------

## 11. INTERESTS AND LEADS

Buyer action:

> **I'm Interested**

should create measurable Marketplace engagement.

Typical flow:

`Match → Interest → Lead → Contact/Inspection → Negotiation → Transaction`

Lead states:

-   NEW
-   VIEWED
-   CONTACTED
-   INSPECTION_SCHEDULED
-   NEGOTIATING
-   TRANSACTION_STARTED
-   WON
-   LOST

`SPAM_FRAUD` must use a controlled moderation/risk process.

Negotiation and transaction-start events are strong Escrow
recommendation moments.

------------------------------------------------------------------------

## 12. SELLER SUBSCRIPTIONS

Marketplace monetization is separate from Escrow monetization.

Initial configurable introductory seller prices:

-   Weekly: `₦5,000`
-   Monthly: `₦15,000`

Do not hard-code prices.

Use:

**SubscriptionPlan + Entitlements**

Future plans may include:

-   Free
-   Weekly Seller
-   Professional
-   Business
-   Enterprise

Entitlements may control:

-   listing limits;
-   lead/contact access;
-   staff seats;
-   analytics;
-   CRM;
-   bulk uploads;
-   API access;
-   featured/priority functionality;
-   verification features.

Subscription activation requires verified payment.

------------------------------------------------------------------------

## 13. BUYER CONTACT PRIVACY

### Non-negotiable

> **Seller subscription alone must never expose buyer contact
> information.**

Contact access requires all applicable conditions:

1.  valid subscription/entitlement;
2.  buyer consent/contact preference;
3.  valid match/interest/lead context;
4.  server-side authorization;
5.  audit logging.

Buyer may select permitted channels such as:

-   WhatsApp;
-   phone;
-   email;
-   future TrustMart messaging.

Do not expose buyer databases to sellers.

Treat buyer budgets and purchase intent as sensitive commercial data.

------------------------------------------------------------------------

## 14. ESCROW WORKFLOW

Standalone and Marketplace-originated Escrow use the same engine.

Typical workflow:

`CREATE → PARTIES → TERMS → CONDITIONS → FEE ALLOCATION → INVITE → NEGOTIATE/AMEND → MUTUAL ACCEPTANCE → KYC/RISK → FUNDING INSTRUCTIONS → VERIFIED FUNDING → ACTIVE → FULFILMENT → ACCEPTANCE → RELEASE → COMPLETION → REWARD → REVIEW`

Material transaction terms must be versioned.

No party may secretly alter accepted terms.

A material amendment creates a new version requiring required acceptance
again.

------------------------------------------------------------------------

## 15. ESCROW FEE

Current contemplated TrustMart Escrow fee:

`2.5%`

This is configurable/versioned.

Never hard-code it.

Fee responsibility may be:

-   buyer pays 100%;
-   seller pays 100%;
-   mutually agreed shared allocation.

Shared allocation should support configurable proportions, not only
50/50.

Model transaction principal and TrustMart fee separately.

Final production collection/deduction mechanics depend on approved legal
and payment-provider structure.

------------------------------------------------------------------------

## 16. FINANCIAL SAFETY --- CRITICAL

Never treat any of the following as authoritative proof of payment:

-   screenshot;
-   customer claim;
-   SMS;
-   email;
-   frontend state;
-   unverified webhook;
-   AI output;
-   n8n workflow result.

### Required payment verification

1.  receive provider/bank event;
2.  validate signature/authenticity;
3.  independently verify with provider/bank;
4.  verify amount;
5.  verify reference;
6.  verify destination;
7.  verify status;
8.  enforce idempotency;
9.  create authoritative payment record;
10. post ledger entries atomically;
11. transition Escrow only when eligible;
12. audit/reconcile;
13. notify.

------------------------------------------------------------------------

## 17. FINANCIAL LEDGER

The **Financial Ledger is financial truth**.

Requirements:

-   exact-safe money representation;
-   integer minor units + currency recommended;
-   no JavaScript floating-point financial truth;
-   balanced journal entries;
-   immutable posted entries;
-   compensating/reversal entries for corrections;
-   idempotency;
-   external-reference tracking;
-   reconciliation;
-   auditability.

Never implement:

-   unrestricted `Edit Balance`;
-   silent balance changes;
-   deletion of posted ledger history.

Material financial operations should use maker-checker where
appropriate.

------------------------------------------------------------------------

## 18. CONFIDENTIAL REWARD AND REFERRAL POLICY

Current internal model:

-   Buyer appreciation: `0.1%`
-   Seller appreciation: `0.1%`
-   Referral reward: `0.3%`

These exact percentages are **STRICTLY CONFIDENTIAL INTERNAL
INFORMATION**.

### Never expose rates to:

-   customers;
-   referrers;
-   public website;
-   customer-facing APIs;
-   frontend bundles;
-   notifications;
-   support responses;
-   marketing;
-   WhatsApp messages;
-   emails;
-   AI responses;
-   unauthorized logs;
-   unauthorized staff.

Customer-facing APIs should expose only appropriate information such as:

-   reward amount;
-   reward type;
-   reward status;
-   date;
-   transaction reference.

Do not send the percentage to the frontend and hide it with CSS.

Do not return it at all.

### Internal access

Use least privilege.

Exact policy rates may be accessible only to authorized internal roles
according to approved RBAC, such as:

-   Super Admin;
-   Finance Admin;
-   authorized Finance Staff;
-   approved Management.

### Calculation authority

The authoritative Reward/Financial Engine calculates rewards.

Not:

-   frontend;
-   AI;
-   n8n;
-   customer application logic.

Reward policies must be versioned and audited.

------------------------------------------------------------------------

## 19. COMPANY REFERRAL

If a user registers without a valid qualifying external referral:

> assign referral ownership to **TrustMart / Company Referral**.

Do not leave referral ownership null.

Detect abuse such as:

-   self-referral;
-   circular referral;
-   fake accounts;
-   fabricated transactions;
-   collusive reward farming.

------------------------------------------------------------------------

## 20. REWARD ELIGIBILITY

Rewards are only finalized for eligible successfully completed Escrow
transactions.

Do not finalize rewards for:

-   failed transactions;
-   cancelled transactions;
-   unresolved disputes;
-   reversals;
-   chargebacks;
-   fraudulent transactions;
-   suspicious/ineligible transactions.

Suggested event flow:

`EscrowCompleted → Reconciliation → Dispute/Reversal/Risk Check → Reward Eligibility → Configurable Short Delay → Ledger Posting → Reward Wallet → Notification`

------------------------------------------------------------------------

## 21. REWARD WALLET

Reward Wallet is separate from transaction funds.

Minimum cash withdrawal:

`₦1,000`

Future small-balance utility may include:

-   airtime;
-   data;
-   Marketplace spending.

Withdrawal requires appropriate identity, risk, ledger and payout
controls.

------------------------------------------------------------------------

## 22. CUSTOMER EXPERIENCE / SERVICE REVIEWS

After an eligible successfully completed Escrow transaction, request
independent TrustMart service feedback from:

-   buyer;
-   seller.

Channels:

-   in-app;
-   email;
-   approved/consented WhatsApp.

Review may contain:

-   overall 1--5 stars;
-   written feedback;
-   ease of use;
-   trust/confidence;
-   service satisfaction;
-   recommend TrustMart: Yes / Maybe / No.

Use configurable request timing and limited reminders.

Stop reminders after submission or final configured reminder.

### Service recovery

-   4--5 stars: thank user.
-   3 stars: improvement feedback / optional follow-up.
-   1--2 stars: create Customer Experience/Support follow-up.
-   Funds/fraud/dispute/legal complaints: human escalation.

### Important distinction

`TrustMart Service Review != Buyer/Seller Reputation Review`

Do not conflate them.

AI may summarize themes/sentiment but must preserve the original review.

Public testimonials require separate consent/moderation.

------------------------------------------------------------------------

## 23. KYC/KYB AND TRUSTGUARD

Use provider-neutral abstractions until providers are approved.

Risk controls may include:

-   duplicate accounts;
-   duplicate listings;
-   suspicious pricing;
-   stolen images where feasible;
-   device/IP signals;
-   velocity;
-   fake interests;
-   self-referrals;
-   circular transactions;
-   payment anomalies;
-   reporting;
-   manual review;
-   restrictions.

AI may assist analysis.

AI must not independently:

-   determine legal title;
-   guarantee seller legitimacy;
-   decide fraud guilt permanently;
-   approve unsupported high-risk KYC;
-   release/refund funds;
-   resolve serious disputes.

------------------------------------------------------------------------

## 24. DISPUTES, RELEASE AND REFUND

Serious disputes require controlled human processes.

Release/refund must respect:

-   accepted terms;
-   evidence;
-   transaction state;
-   dispute/hold status;
-   KYC/risk;
-   authorization;
-   maker-checker where required;
-   ledger rules;
-   audit.

Frontend, n8n, AI and generic Admin actions cannot bypass these guards.

------------------------------------------------------------------------

## 25. ADMIN CONTROL CENTRE

Admin may include:

-   users;
-   businesses;
-   categories/attributes;
-   listings/moderation;
-   buyer requests;
-   matches;
-   leads;
-   subscriptions;
-   KYC/KYB;
-   Escrows;
-   payments;
-   reconciliation;
-   ledger views;
-   disputes;
-   risk;
-   rewards/referrals;
-   reviews/CX;
-   support;
-   analytics;
-   audit;
-   configuration.

### Never create unrestricted financial bypass controls

Examples of prohibited generic controls:

-   `Edit Balance`
-   `Force Payment`
-   `Force Release`
-   `Force Complete`

Admin actions must call guarded backend domain services.

------------------------------------------------------------------------

## 26. n8n BOUNDARIES

n8n may:

-   send notifications;
-   run reminders;
-   re-engage users;
-   route support/KYC/risk cases;
-   sync CRM;
-   orchestrate review requests;
-   route low ratings;
-   run marketing workflows;
-   call authenticated TrustMart APIs;
-   support analytics/liquidity workflows.

n8n must not:

-   write financial tables directly;
-   be the ledger;
-   authoritatively mark payments successful;
-   set arbitrary Escrow financial states;
-   calculate authoritative confidential reward rates;
-   release funds;
-   refund funds;
-   withdraw funds.

------------------------------------------------------------------------

## 27. AI BOUNDARIES

AI may:

-   parse buyer requests;
-   draft listings;
-   detect missing information;
-   explain deterministic matches;
-   suggest alternatives;
-   summarize demand;
-   analyze unsold inventory;
-   draft/triage support;
-   summarize reviews;
-   assist risk analysis.

AI must not:

-   move money;
-   change ledger balances;
-   release/refund/withdraw funds;
-   guarantee title/ownership;
-   guarantee seller legitimacy;
-   independently approve high-risk KYC;
-   resolve serious disputes;
-   reveal confidential reward/referral rates.

Use versioned prompts, tool allowlists, evaluation tests and kill
switches for sensitive automation.

------------------------------------------------------------------------

## 28. TECHNICAL ARCHITECTURE

Preferred MVP:

-   TypeScript;
-   pnpm workspaces;
-   Turborepo;
-   Next.js App Router;
-   NestJS modular monolith;
-   PostgreSQL;
-   Prisma ORM;
-   REST/JSON;
-   OpenAPI;
-   OIDC-compatible identity abstraction;
-   Docker/Compose;
-   n8n;
-   private Git repository.

### Architecture principles

-   modular monolith first;
-   avoid premature microservices;
-   no Kubernetes for MVP unless justified later;
-   one backend financial truth;
-   transactional outbox where durable event delivery is required;
-   UTC authoritative timestamps;
-   UUID/opaque identifiers;
-   server-side RBAC;
-   resource-level authorization;
-   versioned rules;
-   provider adapters;
-   append-oriented audit trail;
-   server-side feature/configuration controls.

------------------------------------------------------------------------

## 29. REPOSITORY STRUCTURE

Preferred structure:

``` text
trustmart/
├── CLAUDE.md
├── README.md
├── IMPLEMENTATION_STATUS.md
├── DECISION_LOG.md
├── RISK_REGISTER.md
├── .env.example
├── .gitignore
├── apps/
│   ├── web/
│   └── admin/
├── services/
│   └── api/
│       └── src/modules/
│           ├── identity/
│           ├── businesses/
│           ├── verification/
│           ├── marketplace/
│           │   ├── categories/
│           │   ├── listings/
│           │   ├── buyer-requests/
│           │   ├── matching/
│           │   ├── interests/
│           │   ├── leads/
│           │   ├── subscriptions/
│           │   └── lifecycle/
│           ├── escrow/
│           ├── payments/
│           ├── ledger/
│           ├── referrals/
│           ├── rewards/
│           ├── reviews/
│           ├── notifications/
│           ├── trustguard/
│           ├── support/
│           ├── analytics/
│           └── audit/
├── packages/
│   ├── contracts/
│   ├── config/
│   ├── database/
│   ├── ui/
│   └── testing/
├── database/
│   └── prisma/
├── automation/
│   ├── n8n/
│   └── agents/
├── docs/
├── infrastructure/
├── tests/
└── scripts/
```

Adapt only when a clearly superior implementation reason exists and
document the decision.

### Recorded deviation — this repository

This repository uses `apps/api` (NestJS) instead of `services/api`, and
does not yet have a separate `apps/admin` (admin functionality is planned
as a module/route area within the existing apps rather than a fourth
app). All Marketplace/Escrow domain modules live under
`apps/api/src/modules/...` following the same module breakdown shown
above. This deviation was recorded rather than silently reconciled — see
`docs/00-ssot/DECISION_LOG.md`, 2026-09-07 entry. Do not rename/move the
existing `apps/api` tree to match the preferred layout without an
explicit, separately-approved task; it is a large low-value diff against
already-working code.

------------------------------------------------------------------------

## 30. CORE DATA DOMAINS

Expected entity families include:

### Identity

User, Profile, Business, BusinessStaff, ExternalIdentity, Role,
Permission, UserRole, VerificationCase.

### Marketplace configuration

Category, Subcategory, AttributeDefinition, AttributeOption,
CategoryAttribute, MatchingProfile, MatchingCriterion,
PlatformConfiguration.

### Seller inventory

Listing, ListingAttributeValue, ListingMedia, ListingDocument,
ListingPriceHistory, ListingLifecycleEvent, ListingModerationCase.

### Buyer demand

BuyerRequest, BuyerRequirement, BuyerRequestLocation,
BuyerRequestLifecycleEvent.

### Matching

MatchRun, Match, MatchCriterionResult, MatchNotification.

### Engagement

SavedListing, Interest, ContactConsent, ContactAccessGrant, Lead,
LeadActivity.

### Subscription

SubscriptionPlan, SubscriptionEntitlement, Subscription,
SubscriptionPayment, SubscriptionEvent.

### Escrow

EscrowTransaction, EscrowParty, EscrowTermVersion, EscrowAcceptance,
EscrowCondition, EscrowFeeAllocation, EscrowEvent.

### Finance

PaymentAccountAssignment, PaymentRecord, WebhookEvent, LedgerAccount,
LedgerJournal, LedgerEntry, LedgerExternalReference,
ReconciliationException.

### Referral/Reward

ReferralRelationship, RewardPolicyVersion, RewardRecord, RewardWallet,
RewardWithdrawal.

### Customer Experience

ReviewRequest, ReviewReminder, ServiceReview, ServiceRecoveryCase.

### Communication

NotificationRecord, NotificationPreference, Consent, WhatsAppConsent,
SupportCase, SupportMessage.

### Risk/Audit

RiskCase, RiskSignal, FraudSignal, Report, AuditEvent.

------------------------------------------------------------------------

## 31. DOMAIN EVENTS

Examples:

-   `MarketplaceListingCreated`
-   `MarketplaceListingActivated`
-   `MarketplaceListingPriceReduced`
-   `MarketplaceListingExpiring`
-   `MarketplaceListingExpired`
-   `MarketplaceBuyerRequestActivated`
-   `MarketplaceMatchCreated`
-   `MarketplaceInterestCreated`
-   `MarketplaceContactAccessGranted`
-   `MarketplaceLeadStatusChanged`
-   `SubscriptionActivated`
-   `SubscriptionExpiring`
-   `SubscriptionExpired`
-   `EscrowDraftCreatedFromMarketplace`
-   `EscrowCreated`
-   `EscrowTermsAccepted`
-   `PaymentVerified`
-   `EscrowFunded`
-   `EscrowCompleted`
-   `RewardEligibilityReady`
-   `RewardAvailable`
-   `ReviewRequestScheduled`
-   `ServiceReviewSubmitted`

Use backend domain events and a transactional outbox where durable
delivery is needed.

------------------------------------------------------------------------

## 32. API RULES

Preferred conventions:

-   `/api/v1/...`
-   REST/JSON
-   OpenAPI
-   server-side authorization
-   resource ownership checks
-   consistent error format
-   correlation IDs
-   idempotency keys for financial mutations

Never rely on frontend hiding for authorization.

------------------------------------------------------------------------

## 33. SECURITY

Required controls include:

-   TLS;
-   secure authentication;
-   MFA for privileged users;
-   RBAC;
-   resource-level authorization;
-   encryption of sensitive data where appropriate;
-   secure sessions;
-   rate limiting;
-   secret management;
-   webhook verification;
-   idempotency;
-   upload validation;
-   audit logs;
-   backups;
-   monitoring;
-   least privilege.

High-risk tests must include:

-   IDOR;
-   privilege escalation;
-   buyer-contact scraping;
-   subscription bypass;
-   forged webhook;
-   replayed webhook;
-   duplicate funding;
-   double release;
-   refund/release race;
-   ledger imbalance;
-   duplicate reward;
-   reward-rate leakage;
-   self-referral;
-   circular transaction;
-   AI prompt injection;
-   n8n privilege abuse;
-   review manipulation.

------------------------------------------------------------------------

## 34. PUBLIC WEBSITE / PRODUCT UI

Build Web/PWA first.

Primary public navigation should communicate:

-   **Find a Deal / Marketplace**
-   **Secure a Deal / Escrow**

Dashboard areas:

### Marketplace

-   Buyer Requests
-   Listings
-   Matches
-   Interests
-   Saved
-   Leads

### Escrow

-   Create Escrow
-   Transactions
-   Invitations
-   Actions
-   Completed
-   Disputes

### Trust

-   Verification
-   Service Review/history
-   future reputation

### Finance

-   Reward Wallet
-   Rewards
-   Withdrawals

### Account

-   Referral
-   Notifications
-   Settings

Use a premium, clean, white-dominant interface with navy structure and
gold branded emphasis.

Maintain accessibility and responsive mobile-browser support.

Android follows meaningful traction.

iOS later.

------------------------------------------------------------------------

## 35. ANALYTICS

Marketplace funnel:

`Visitor → Registered → Buyer Request/Seller Listing → Match → Interest → Contact → Inspection/Negotiation → Transaction Started → Transaction Completed → Reward → Service Review → Repeat`

Track:

-   active buyers;
-   active sellers;
-   listings;
-   buyer requests;
-   match rate;
-   match score;
-   time to first match;
-   match-to-interest;
-   interest-to-contact;
-   contact-to-transaction;
-   completion;
-   sell-through;
-   subscription conversion;
-   renewal;
-   retention;
-   GMV;
-   Escrow adoption;
-   fraud/risk;
-   review response;
-   satisfaction/recommendation.

Near-term North Star:

> **Successful Buyer-Seller Matches Resulting in Verified Commercial
> Progress**

Long-term:

> **Successfully Completed TrustMart Transactions**

------------------------------------------------------------------------

## 36. LIQUIDITY INTELLIGENCE

Build internal analytics capable of detecting demand/supply imbalances
by:

-   category;
-   subcategory;
-   geography;
-   budget/price range;
-   buyer criteria.

Example:

> Many active qualified buyers in a location but insufficient seller
> inventory.

The system may recommend targeted seller acquisition.

Do not expose sensitive individual buyer intent in management summaries
unnecessarily.

------------------------------------------------------------------------

## 37. IMPLEMENTATION ORDER

Build in this order unless a documented dependency requires adjustment:

### Phase 0 --- Repository / Source of Truth

-   project instructions;
-   baseline;
-   document conflicts;
-   status/decision/risk/traceability.

### Phase 1 --- Shared Core

-   identity/auth;
-   User/Profile;
-   Business/Staff;
-   RBAC;
-   configuration;
-   audit;
-   consent;
-   notification preferences;
-   verification foundation.

### Phase 2 --- Marketplace Foundation

-   Category Engine;
-   Dynamic Attributes;
-   Listings;
-   Buyer Requests;
-   search foundation.

### Phase 3 --- Matching & Opportunity

-   deterministic matching;
-   criterion results;
-   Match events;
-   Interests;
-   Contact Consent/Access;
-   Leads.

### Phase 4 --- Marketplace Monetization & Lifecycle

-   Subscription Plans;
-   Entitlements;
-   Subscription Payment;
-   listing expiry/renewal;
-   price history;
-   re-engagement.

### Phase 5 --- Standalone Escrow

-   transaction creation;
-   parties;
-   terms;
-   versions;
-   acceptance;
-   conditions;
-   fee allocation;
-   state machine.

### Phase 6 --- Payments & Ledger

-   provider abstraction;
-   payment verification;
-   virtual/payment accounts;
-   ledger;
-   reconciliation;
-   funding.

### Phase 7 --- Trust / Completion

-   KYC/KYB;
-   TrustGuard;
-   disputes;
-   refunds;
-   release;
-   completion.

### Phase 8 --- Referral / Rewards / Reviews

-   Company Referral;
-   confidential policy;
-   Reward Wallet;
-   withdrawal;
-   review requests;
-   CX/service recovery.

### Phase 9 --- Marketplace → Optional Escrow

-   Escrow demo/CTA;
-   DRAFT handoff;
-   prefill;
-   explicit terms confirmation.

### Phase 10 --- Admin & Analytics

-   operational Admin;
-   configuration;
-   CX;
-   KPIs;
-   liquidity intelligence.

### Phase 11 --- n8n & AI

Only around stable APIs and domain rules.

### Phase 12 --- QA / UAT / Launch

-   security;
-   financial testing;
-   staging;
-   legal/provider readiness;
-   operational readiness;
-   soft launch.

------------------------------------------------------------------------

## 38. MVP SCOPE DISCIPLINE

Do not prematurely build:

-   complex predictive AI;
-   full enterprise CRM;
-   advanced public reputation system;
-   enterprise API ecosystem;
-   predictive pricing;
-   complex offer negotiation;
-   multi-country support;
-   native Android/iOS before Web/PWA traction;
-   Kubernetes;
-   unnecessary microservices;
-   unnecessary infrastructure.

Build the smallest secure architecture that preserves future
extensibility.

------------------------------------------------------------------------

## 39. OPEN DECISIONS --- DO NOT INVENT

Unless later approved, do not invent:

### Legal / Compliance

-   final Nigerian customer-funds legal structure;
-   final KYC/AML operational rules;
-   final contractual/dispute wording.

### Providers

-   production payment/banking provider;
-   virtual account provider;
-   identity provider;
-   KYC/KYB provider;
-   WhatsApp Business provider;
-   email provider;
-   object storage;
-   map/geocoding provider;
-   payout provider.

### Finance

-   final chart of accounts;
-   final tax/accounting treatment;
-   final production fee collection mechanics.

### Marketplace

-   final free/trial entitlements;
-   final category-specific weights;
-   final moderation thresholds.

Build abstractions/mocks where appropriate and record the dependency.
See `docs/00-ssot/OPEN_DECISIONS.md` for the live tracked list for this
repository.

------------------------------------------------------------------------

## 40. TESTING REQUIREMENTS

For each implemented phase, add appropriate:

-   unit tests;
-   integration tests;
-   API/contract tests;
-   authorization tests;
-   database/migration tests;
-   negative tests;
-   concurrency tests;
-   idempotency/retry tests;
-   end-to-end tests;
-   security tests.

Financial modules require stronger adversarial testing.

Do not consider a feature complete merely because the happy path works.

------------------------------------------------------------------------

## 41. MIGRATION SAFETY

Before running a migration:

1.  inspect generated SQL;
2.  identify destructive changes;
3.  identify locking/data-loss risk;
4.  confirm rollback/recovery approach;
5.  run in development first;
6.  test existing data where relevant.

Do not run destructive migration/reset commands without explicit
approval.

Never alter historical posted ledger data via a schema/data shortcut.

------------------------------------------------------------------------

## 42. GIT WORKING METHOD

For major work:

1.  start from clean status;
2.  create a bounded branch;
3.  inspect current baseline;
4.  plan;
5.  implement;
6.  test;
7.  review diff;
8.  update project records;
9.  commit with a meaningful message.

Do not bundle unrelated architectural changes into one commit.

Never commit:

-   `.env`;
-   production secrets;
-   private keys;
-   provider credentials;
-   customer data exports.

------------------------------------------------------------------------

## 43. PROJECT RECORDS

Maintain these files when present:

-   `docs/00-ssot/IMPLEMENTATION_STATUS.md`
-   `docs/00-ssot/DECISION_LOG.md`
-   `docs/00-ssot/RISK_REGISTER.md`
-   `docs/00-ssot/MASTER_DOCUMENT_REGISTER.md`
-   implementation traceability documentation

After material work, update:

-   what changed;
-   what remains;
-   tests;
-   migration status;
-   decisions;
-   new risks;
-   blockers;
-   next recommended task.

------------------------------------------------------------------------

## 44. CLAUDE CODE WORKING BEHAVIOUR

Before a material implementation, respond with:

### Scope

What will be built.

### Exclusions

What will not be built in this task.

### Files

Likely files/modules affected.

### Data

Schema/migration impact.

### API

Endpoints/contracts/events affected.

### Security

Authorization/privacy/financial impact.

### Tests

Required positive and negative tests.

### Risks/Open Decisions

Anything needing founder/legal/provider approval.

Then wait for approval when the change materially affects architecture,
financial rules, security, privacy, or approved business behaviour.

------------------------------------------------------------------------

## 45. ADVERSARIAL REVIEW

After sensitive phases, review the implementation as an attacker and
failure engineer.

Explicitly inspect:

-   authentication;
-   RBAC;
-   IDOR;
-   consent;
-   contact privacy;
-   subscription bypass;
-   state transition bypass;
-   payment forgery;
-   webhook replay;
-   idempotency;
-   concurrency;
-   double spend/release/refund;
-   ledger imbalance;
-   reward duplication;
-   reward-rate leakage;
-   self-referral;
-   admin bypass;
-   n8n compromise;
-   AI prompt injection;
-   audit gaps;
-   sensitive logs.

Report severity, exploit path, impact, affected code, remediation, and
regression test.

------------------------------------------------------------------------

## 46. STOP CONDITIONS

STOP and ask for clarification/approval if:

-   legal customer-funds structure is required but unresolved;
-   a production provider must be selected;
-   financial rules conflict;
-   reward/referral rules conflict;
-   a destructive migration is proposed;
-   confidential reward rates would reach customer/client code;
-   direct financial DB bypass is requested;
-   a production secret is required;
-   historical posted ledger data would be mutated;
-   Marketplace is being made to require Escrow;
-   authorization/security would be weakened;
-   a serious specification conflict cannot be resolved using the
    authority order.

------------------------------------------------------------------------

## 47. PRODUCTION LAUNCH GATES

Do not recommend production launch until applicable gates are satisfied:

-   legal/compliance funds-flow approval;
-   production payment/banking provider readiness;
-   KYC/AML process readiness;
-   production secrets management;
-   database backups and restore test;
-   monitoring/logging;
-   reconciliation process;
-   dispute/refund operations;
-   customer support readiness;
-   security testing;
-   financial invariant testing;
-   staging/UAT;
-   legal/policy pages;
-   incident response;
-   business continuity;
-   no unresolved critical/high launch blockers.

------------------------------------------------------------------------

## 48. LAUNCH STRATEGY

Prefer a controlled soft launch.

Start with concentrated Marketplace liquidity rather than every
category/location.

Recommended initial focus:

**Real Estate + selected geography + trusted sellers + actively acquired
buyer requests.**

Expand only after evidence of:

-   demand;
-   supply;
-   match quality;
-   operational capacity;
-   fraud controls;
-   user satisfaction;
-   transaction progress.

------------------------------------------------------------------------

## 49. DEFINITION OF DONE

A feature is not done until:

-   business rule matches the Master Project Document;
-   authorization is correct;
-   validation is correct;
-   data model is appropriate;
-   migration is reviewed;
-   API contract is documented;
-   positive tests pass;
-   negative tests pass;
-   audit requirements are met;
-   privacy/security is reviewed;
-   relevant events/notifications work;
-   documentation/status is updated;
-   no unresolved critical issue remains.

Financial features additionally require:

-   exact-safe arithmetic;
-   idempotency;
-   concurrency review;
-   ledger integrity;
-   reconciliation;
-   provider verification where applicable;
-   maker-checker where required;
-   adversarial testing.

------------------------------------------------------------------------

## 50. FIRST SESSION INSTRUCTION

When first entering this repository:

**DO NOT CODE IMMEDIATELY.**

Perform a repository audit.

Read:

-   `CLAUDE.md`;
-   TrustMart Comprehensive Master Project Document v5.0;
-   existing documentation;
-   source code;
-   Prisma schema/migrations;
-   tests;
-   automation workflows;
-   project status/decision/risk records.

Then explain in your own words:

1.  What TrustMart is.
2.  How Marketplace works.
3.  Why Marketplace Escrow is optional.
4.  Why Escrow is standalone.
5.  How seller subscriptions work.
6.  Why buyer consent is required for contact access.
7.  How deterministic matching works.
8.  Which values are configurable.
9.  How Escrow fee allocation works.
10. Why reward/referral rates are confidential.
11. How Company Referral works.
12. Why the ledger is financial truth.
13. Why AI and n8n cannot move money.
14. How service reviews work.
15. What the current brand/tagline is.
16. What remains undecided.
17. What has already been implemented.
18. What the next bounded implementation phase should be.

Do not make material changes until the audit is correct.

------------------------------------------------------------------------

## 51. MASTER PRINCIPLE

> **TrustMart is one Trust & Commerce Network.**

Marketplace creates opportunities.

Escrow secures eligible transactions from TrustMart or elsewhere.

Marketplace Escrow is optional.

Seller subscriptions monetize Marketplace opportunity access.

Buyer privacy and consent remain protected.

The backend and ledger own financial truth.

AI assists.

n8n orchestrates.

Humans remain accountable for high-risk financial, legal, fraud and
dispute decisions.

The brand promise is:

> **FIND. SECURE. TRANSACT.**
