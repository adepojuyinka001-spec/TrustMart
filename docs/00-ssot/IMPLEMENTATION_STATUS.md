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
- [ ] Subscription Plan / Entitlement / Lifecycle — not started. **This is what currently keeps contact access permanently denied**; wiring `ContactAccessService.hasActiveEntitlement()` to a real check is part of this future phase, not a follow-up bug fix.

## Standalone Escrow
- [ ] Parties / versioned terms / acceptance
- [ ] Conditions
- [ ] Fee allocation
- [ ] State transitions
- [ ] Live provider funding — **blocked**, requires legal/provider approval (see Open Decision #1)

## Confidential Rewards
- [ ] Internal versioned reward policy
- [ ] Ledger-backed reward credit
- [ ] Leakage tests (API/logs/DTOs)

## Reviews
- [ ] Review request scheduling
- [ ] Service-recovery case flow

## Cross-cutting
- [ ] Adversarial security review pass
