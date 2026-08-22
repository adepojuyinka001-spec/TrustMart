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
