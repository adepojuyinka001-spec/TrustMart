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
- [x] Docker Compose (Postgres + n8n) file written — **not yet run**; Docker Desktop is not installed on this machine (see Open Decision below).

## Shared Core
- [x] Identity/auth provider abstraction — `AuthProvider` interface + self-hosted `LocalAuthProvider` (bcryptjs + JWT), unit-tested.
- [x] User / Profile — schema + CRUD endpoints written.
- [x] Business / Staff — schema + CRUD endpoints written.
- [x] RBAC — Role/Permission/UserRole schema, seed data, `PermissionGuard`, unit-tested (positive + negative).
- [x] Platform configuration — generic typed config store, seeded with SSOT defaults, admin-gated write endpoint.
- [x] Audit — `AuditService` wired into every mutating Shared Core action.
- [x] Consent / notification preferences — schema + endpoints written.
- [x] Verification foundation — provider-agnostic `VerificationCase` shell written.
- [ ] **Database-dependent verification pending**: `prisma migrate dev`, seed script run, and the full e2e test suite (`apps/api/test/app.e2e-spec.ts`) all require a live Postgres instance, which needs Docker Desktop installed locally first. Code has been type-checked, built, and covered by DB-independent unit tests (7/7 passing) in the meantime.

## Marketplace Core
- [ ] Category / Dynamic Attribute Engine
- [ ] Listing Engine
- [ ] Buyer Request Engine
- [ ] Matching Engine

## Interest / Contact / Subscription
- [ ] Interest / Lead
- [ ] Contact Consent / Access
- [ ] Subscription Plan / Entitlement / Lifecycle

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
