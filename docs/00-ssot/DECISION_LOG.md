# TrustMart Decision Log

Append-only. Each entry is a decision that has actually been approved, with date and reasoning. Do not edit or delete past entries — add a new entry if a decision changes.

## 2026-08-22 — Repository and dev-stack setup
- **Decision:** Build TrustMart directly via Claude Code (CLI session) rather than requiring VS Code; VS Code remains optional.
- **Decision:** Private GitHub repository `adepojuyinka001-spec/TrustMart` is the TrustMart-owned repo of record.
- **Decision:** Local Postgres via Docker for development (not a hosted free tier like Neon/Supabase), to keep dev data local and avoid third-party exposure during early build-out.
- **Decision:** n8n will be self-hosted via Docker rather than n8n Cloud, to stay on free tooling.
- **Decision:** First scaffolding pass creates only docs + repo structure; monorepo/code skeleton and Shared Core implementation are separate, explicitly approved follow-up phases.
- **Reasoning:** Matches `CLAUDE.md` §13 preferred stack and the founder's instruction to use free tooling wherever possible.

## 2026-08-22 — Escrow tagline vs. existing SSOT campaign line
- **Conflict found:** The approved TrustMart Escrow logo lockup carries the tagline "We Hold. You Trust. We Deliver.", which was not previously documented anywhere in CLAUDE.md or the SSOT. The SSOT already documented a separate Escrow campaign/CTA line, "Secure the Deal."
- **Decision:** Both are retained as distinct, non-conflicting assets: "Secure the Deal" is Escrow's short campaign/CTA copy (e.g. button and ad copy); "We Hold. You Trust. We Deliver." is the Escrow logo lockup tagline (brand identity material, e.g. letterhead, signage, app splash). Neither replaces the master brand line, "Securing Transactions. Building Trust."
- **Reasoning:** Founder approved treating the logo tagline the same way the existing Marketplace campaign line is treated — additive, not a replacement — per `CLAUDE.md` §3.
- Recorded in `CLAUDE.md` §3 and `docs/00-ssot/TRUSTMART_SSOT_v2.0.md` §14–15.

## 2026-08-22 — Monorepo skeleton + Shared Core, first implementation pass
- **Decision:** Built the approved Phase 1 plan (pnpm/Turborepo monorepo, `apps/api` NestJS backend, `apps/web` Next.js skeleton, Prisma schema, Shared Core modules — identity/auth, users, business, RBAC, platform configuration, audit, consent, verification).
- **Decision:** Password hashing uses `bcryptjs` (pure JS) instead of native `bcrypt`, to avoid native build-tool requirements on this Windows dev machine. Free, no functional downside for this scale.
- **Decision:** `pnpm` is invoked via `npx pnpm@latest ...` rather than a global install, because `corepack enable` failed with an `EPERM` writing to `C:\Program Files\nodejs\` (no admin rights in this shell). This is a local workaround, not a project convention — a properly elevated machine can `corepack enable` normally.
- **Verified:** Both apps type-check and build cleanly; 7/7 DB-independent unit tests pass (RBAC guard positive/negative, auth service positive/negative); the Next.js placeholder page was checked in-browser and renders the correct brand colors, Montserrat font, and copy.
- **Blocked/pending:** Docker Desktop is not installed on this machine, so Postgres/n8n haven't been started — `prisma migrate dev`, the seed script, and the full e2e suite are written but not yet run. Tracked as Open Decision #6.
- **Reasoning:** Matches the approved plan; deviations (bcryptjs, npx-invoked pnpm) were pragmatic, non-architectural choices to keep the build free and unblocked on this specific machine.
