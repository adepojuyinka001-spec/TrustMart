# TrustMart Implementation Status

Reflects what actually exists in the codebase, not what is planned. Update at the end of each build phase.

## Repository / infrastructure
- [x] Private GitHub repository created (`adepojuyinka001-spec/TrustMart`).
- [x] `CLAUDE.md` and `docs/` tree scaffolded.
- [x] Local git initialized, committed, and pushed to `origin/master`.
- [x] pnpm workspace + Turborepo skeleton.
- [x] Next.js App Router app skeleton (`apps/web`) — branded placeholder page, verified in-browser (navy/gold/Montserrat render correctly).
- [x] NestJS app skeleton (`apps/api`) — builds and type-checks cleanly.
- [x] Prisma initialized — schema + seed script written, client generates successfully.
- [x] Docker Compose (Postgres + n8n) file written — not run on this machine; local dev instead uses a portable, non-Docker PostgreSQL 18.6 on port 5433 (see `docs/00-ssot/DECISION_LOG.md`, 2026-09-07). n8n not yet running (no current dependency on it).

## Shared Core
- [x] Identity/auth provider abstraction — `AuthProvider` interface + self-hosted `LocalAuthProvider` (bcryptjs + JWT), unit-tested.
- [x] User / Profile — schema + CRUD endpoints written.
- [x] Business / Staff — schema + CRUD endpoints written.
- [x] RBAC — Role/Permission/UserRole schema, seed data, `PermissionGuard`, unit-tested (positive + negative).
- [x] Platform configuration — generic typed config store, seeded with SSOT defaults, admin-gated write endpoint.
- [x] Audit — `AuditService` wired into every mutating Shared Core action.
- [x] Consent / notification preferences — schema + endpoints written.
- [x] Verification foundation — provider-agnostic `VerificationCase` shell written.
- [x] **Database-dependent verification complete**: `prisma migrate dev --name init` applied against a live local Postgres; seed script run successfully (roles, permissions, default platform configuration); full e2e suite (`apps/api/test/app.e2e-spec.ts`) passes 4/4, including RBAC positive/negative and an audit-log assertion. All 24 unit tests also pass.

## Marketplace Core
- [x] Category / Dynamic Attribute Engine — Category/Subcategory/AttributeDefinition/AttributeOption/CategoryAttribute CRUD, admin-gated (`category:manage`), public reads. Wired into `AppModule` and verified end-to-end (2026-09-07).
- [x] Listing Engine — full DRAFT→SUBMITTED→CHECKING→ACTIVE lifecycle (approve/reject/mark-sold), price history, dynamic attribute values. Wired into `AppModule` and verified end-to-end.
- [x] Buyer Request Engine — DRAFT→ACTIVE (explicit buyer confirmation) →CANCELLED, hard/preferred requirements. Wired into `AppModule` and verified end-to-end.
- [x] Matching Engine — `MatchingEngineService` orchestrates the pure `evaluateMatch()` scorer against live listings/buyer-requests, persists `MatchRun`/`Match`/`MatchCriterionResult`, applies the configurable threshold (`marketplace.match_threshold_percent`, plus per-profile overrides), classifies results (Excellent/Strong/Good/Alternative), and emits a `marketplace.match.created` domain event via `EventEmitter2` the first time a pair newly qualifies. Versioned `MatchingProfile`/`MatchingCriterion` weights are admin-managed (`matching:manage`). Buyer- and seller-facing match views are ownership-scoped (sellers never see buyer budgets/requirements). Recalculation triggers wired from listing activation/price-change/approval and buyer-request activation/update.
  - **Bug found and fixed in this pass**: Prisma `BigInt` money/budget fields (`askingPriceMinorUnits`, `minBudgetMinorUnits`, etc.) couldn't be JSON-serialized by Express — a `toJSON` polyfill existed but only ran in `main.ts`'s `bootstrap()`, so it never applied to e2e tests or any other entry point that constructs `AppModule` directly. Moved to a side-effect import (`src/bigint-json.polyfill.ts`) at the top of `app.module.ts` so it's always active. This bug had been latent since these modules were never previously registered in `AppModule`.
  - Verified end-to-end (`apps/api/test/matching.e2e-spec.ts`): full category→subcategory→attribute→listing→buyer-request→match flow, hard-requirement disqualification, threshold qualification, seller-facing privacy (no buyer budget/requirement leakage), and RBAC positive/negative on both category management and matching-profile management. 7/7 e2e tests pass (4 pre-existing + 3 new), 24/24 unit tests pass.
  - Seed data extended: `category:manage`, `listing:moderate`, `matching:manage` permissions (previously referenced by guards but never seeded — ADMIN would have silently lacked them); `marketplace.match_budget_weight_percent` / `marketplace.match_location_weight_percent` config defaults (25% each, mirroring the SSOT's illustrative Real Estate weight example).

## Interest / Contact / Subscription
- [x] Interest / Lead — `InterestService` ("I'm Interested" creates an Interest + its Lead atomically; blocks self-interest and duplicate interest on the same listing), `LeadService` (seller-driven status transitions NEW→VIEWED→CONTACTED→INSPECTION_SCHEDULED→NEGOTIATING→TRANSACTION_STARTED→WON/LOST, each recorded as a `LeadActivity`; WON/LOST/SPAM_FRAUD are terminal). SPAM_FRAUD is reachable only via the `lead:moderate` permission (RISK_ANALYST/ADMIN), never a normal seller action. Emits `marketplace.interest.created` / `marketplace.lead.status_changed` domain events.
- [x] Contact Consent / Access — `ContactAccessService` enforces all 5 CLAUDE.md SS5/SS13 conditions; **deliberately fails closed** on the subscription/entitlement check (`hasActiveEntitlement()` always returns `false`) because Subscription/Entitlement doesn't exist yet (see below) — contact access cannot currently be granted to anyone, by design, not by omission. Every attempt (granted or denied) is recorded in both `ContactAccessGrant` and the generic `AuditEvent` log. Reuses the existing `ConsentService.hasGrantedConsent()` for buyer consent.
- [x] Subscription Plan / Entitlement (catalog only) — `SubscriptionPlanService`/`SubscriptionPlanController`: admin-managed (`subscription:manage`) `SubscriptionPlan` + generic key/value `SubscriptionEntitlement` catalog, publicly readable (active plans only) so buyers/sellers can see pricing before subscribing. Seeded with an illustrative FREE/WEEKLY_SELLER/MONTHLY_SELLER catalog matching the SSOT's introductory pricing. **Deliberately does not include** a `Subscription` (the seller's actual paid instance), `SubscriptionPayment`, or any activation path — founder chose "catalog only, no activation yet" (2026-09-07) specifically to avoid inventing a money-handling flow before Open Decision #1 (payment provider) is resolved. `ContactAccessService.hasActiveEntitlement()` therefore still correctly always returns `false` — this phase did not change that.
- [ ] Subscription / SubscriptionPayment / activation — blocked on Open Decision #1 (payment provider). Wiring `ContactAccessService.hasActiveEntitlement()` to a real check is part of this future phase.
- [x] Listing expiry/renewal — `ListingLifecycleService`: idempotent `sweep()` (ACTIVE→EXPIRING inside a configurable warning window, then →EXPIRED past `expiresAt`; admin/n8n-triggered via `POST /listings/lifecycle/sweep`, gated on `listing:lifecycle_sweep` — n8n may call the schedule per CLAUDE.md SS26 but never sets status itself) and `renew()` (seller's explicit "STILL AVAILABLE" response, `POST /listings/:id/renew`, resets to ACTIVE with a fresh `expiresAt`). `ListingService.markSold()` extended to also accept EXPIRING (the other branch of the SOLD-vs-STILL-AVAILABLE prompt). Price history and re-engagement notifications remain for a later pass (re-engagement is n8n/notification territory, Phase 11).

## Standalone Escrow
- [x] Parties / versioned terms / acceptance — `EscrowService`: one Escrow Engine for any origin (`EscrowOriginType`: DIRECT/MARKETPLACE/PARTNER/BUSINESS_API, Marketplace reference optional/nullable). Creation invites parties and proposes version-1 terms in one transaction (creator auto-accepts their own proposal); `accept()` requires every party to accept the *current* active term version before the transaction moves DRAFT/TERMS_PROPOSED→ACCEPTED; a material amendment (`proposeAmendment()`) creates a new version, resets to TERMS_PROPOSED, and clears the acceptance requirement — no party can silently keep old acceptances valid against new terms (CLAUDE.md SS14).
- [x] Conditions — free-text `EscrowCondition` rows per term version, ordered, editable only via a new version (never mutated on an accepted version).
- [x] Fee allocation — `feeAllocation` (BUYER_PAYS/SELLER_PAYS/SHARED, with `buyerFeeSharePercent` for SHARED) recorded as an agreed *term*, not a money movement. `feePercent` is snapshotted from `PlatformConfiguration` (`escrow.fee_percent`) at proposal time so a later config change never retroactively alters an already-proposed/accepted version.
- [x] State transitions (pre-funding only) — DRAFT/TERMS_PROPOSED/ACCEPTED/CANCELLED. `decline()` (only before acceptance) and `cancel()` (any party, any time before... well, any non-cancelled state, with a required reason) both transition to CANCELLED.
- [ ] Funding-onward states (FUNDING_INSTRUCTIONS, VERIFIED_FUNDING, ACTIVE, FULFILMENT, RELEASE, COMPLETION), KYC/risk gating, and any ledger/payment integration — **deliberately not built**. Founder chose "non-financial scaffolding only" for this phase (2026-09-07) specifically to avoid inventing a money-handling flow before Open Decision #1 (payment provider) and the legal customer-funds structure are resolved. This is Phase 6 (Payments & Ledger) / Phase 7 (Trust/Completion) territory.
- [ ] Live provider funding — **blocked**, requires legal/provider approval (see Open Decision #1)

## Marketplace -> Optional Escrow (Phase 9)
- [x] Escrow demo/CTA prefill / DRAFT handoff — `EscrowService.createFromLead()` (`POST /escrows/from-lead/:leadId`): prefills origin (MARKETPLACE), listing reference, title/description/currency, and a default transaction amount (the listing's current asking price, overridable) from an existing Lead. Only a party to the Lead may initiate. Delegates to the same `create()` path as any other escrow, so the counterparty must still explicitly accept — the handoff never silently converts Marketplace data into binding terms (CLAUDE.md SS4). Emits `escrow.draft_created_from_marketplace`.

## Developer tooling
- [x] Live OpenAPI/Swagger docs — `SwaggerModule` wired into `main.ts` (dev-only, not gated; CLAUDE.md SS28 "REST/JSON; OpenAPI"), served at `/api-docs`. Every controller tagged with `@ApiTags` so the UI groups by module (Auth, Categories, Listings, Matching, Buyer Requests, Interests, Leads, Contact Access, Subscription Plans, Escrow, etc.) instead of one flat list. Added `trustmart-api` to `.claude/launch.json` (port 4000) alongside the existing `trustmart-web` entry. Requested by the founder to visually confirm session progress; verified live in-browser and via `read_page` (all 15 tagged groups present) — not just claimed. Revisit gating/auth on `/api-docs` before any real deployment.

## Referral / Rewards
- [x] Company Referral (relationship tracking only) — `ReferralService.assignReferralOnRegistration()`: every new user gets a unique 8-character referral code (Crockford-style alphabet, no 0/O/1/I); if a valid code was supplied at registration, `ReferralRelationship.referrerType = USER` with the referrer linked, otherwise `COMPANY` (CLAUDE.md SS19: "No qualifying external referral => Company Referral. Do not leave referral ownership null." — never null, verified by test). Self-referral and circular referral are structurally impossible (a brand-new user has no code yet at the moment they'd need one to refer themselves; relationships are set exactly once and never retroactively edited), so no additional runtime check was needed for those two abuse vectors specifically. `GET /referrals/mine` returns own code, referrer type, and count of people referred.
- [ ] Fake-account / fabricated-transaction / collusive-reward-farming detection — TrustGuard territory (Phase 7+), not built.
- [ ] Internal versioned reward policy
- [ ] Ledger-backed reward credit
- [ ] Leakage tests (API/logs/DTOs)
- [ ] Reward computation/payout — **blocked**: requires a completed, funded Escrow transaction, which requires Phase 6 (Payments & Ledger), which is blocked on Open Decision #1. Only the referral *relationship* is tracked so far, never a reward amount.

## Reviews
- [ ] Review request scheduling
- [ ] Service-recovery case flow

## Admin & Analytics (Phase 10, groundwork)
- [x] Admin audit-event browsing — `GET /admin/audit-events` (filter by `resourceType`/`action`, paginated via `take`/`skip`), gated on `audit:read` (ADMIN/RISK_ANALYST/SUPPORT already had this permission seeded). Read-only over the existing append-only `AuditEvent` log.
- [x] Admin analytics overview — `GET /admin/analytics/overview`, gated on a new `analytics:read` permission (ADMIN only). Aggregate counts across users, listings-by-status, buyer-requests-by-status, match totals/qualification rate, interests, leads-by-status, escrows-by-status, active subscription plans, and referrals-by-type. Deliberately simple counts/group-bys, not the full Marketplace funnel or Liquidity Intelligence (CLAUDE.md SS35/SS36) — those need event-timestamp analysis and geography/demand-supply breakdowns not wired yet. No financial figures (GMV, revenue) since nothing has completed/paid yet.
- [ ] Full funnel analytics, Liquidity Intelligence, KYC/KYB admin queue, dispute/risk admin views, ledger/reconciliation views, CX/support tooling — not built; most depend on modules (Payments/Ledger, KYC provider, Escrow completion, Reviews) that don't exist yet.

## Cross-cutting
- [x] Adversarial security review pass (2026-09-07, initial) — ran the `security-review` skill against the full diff of all 8 commits this session (Marketplace Core wiring, Matching Engine, Engagement, Subscription catalog, Escrow scaffolding, Marketplace-to-Escrow handoff, Swagger docs). Focused on IDOR/ownership checks on every resource-ID endpoint, buyer-budget/contact-data leakage to sellers, RBAC guard correctness, and injection vectors. **No high-confidence findings.** This is a scoped review of what exists so far (no payments/ledger/rewards/n8n/AI yet, so those categories in CLAUDE.md SS45 don't yet apply) — re-run after each future sensitive phase, per CLAUDE.md SS45, especially once Phase 6 (Payments & Ledger) introduces real money movement.
