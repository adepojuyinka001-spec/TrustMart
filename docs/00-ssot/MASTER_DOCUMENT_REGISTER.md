# TrustMart Master Document Register

Tracks every current authoritative document and its status. Update whenever a document is added, superseded, or replaced. Superseded documents move to `docs/99-superseded/` and get an entry here noting what replaced them.

| Doc | Path | Version | Status | Notes |
|---|---|---|---|---|
| Root Claude instructions | `CLAUDE.md` | v5.0 | Current | Authoritative root instruction file |
| Master Project Document | `docs/00-ssot/TrustMart_Comprehensive_Master_Project_Document_v5.0_Claude_Code.pdf` | v5.0 | Current | Highest-priority business/product authority after law; replaces the SSOT v2.0's role |
| Master Document Register | `docs/00-ssot/MASTER_DOCUMENT_REGISTER.md` | — | Current | This file |
| Open Decisions | `docs/00-ssot/OPEN_DECISIONS.md` | — | Current | Unresolved questions blocking implementation |
| Implementation Status | `docs/00-ssot/IMPLEMENTATION_STATUS.md` | — | Current | What is actually built, by module |
| Decision Log | `docs/00-ssot/DECISION_LOG.md` | — | Current | Append-only record of approved decisions |
| Risk Register | `docs/00-ssot/RISK_REGISTER.md` | — | Current | Tracked security/financial/compliance risks |
| Marketplace Technical Architecture & Database Blueprint | `docs/02-architecture/TRUSTMART_MARKETPLACE_TECHNICAL_ARCHITECTURE_AND_DATABASE_BLUEPRINT_v1.0.md` | v1.0 | Current | Implementation-ready architecture; not yet reconciled against v5.0 wording — treat v5.0 as authoritative on conflict |
| Claude Code Master Prompts | `docs/09-prompts/CLAUDE_CODE_MASTER_PROMPTS.md` | v2.0 | Current | Reusable prompts for each build phase; not yet reconciled against v5.0 wording |
| Start Here Checklist | `docs/START_HERE_CHECKLIST.md` | v2.0 | Current | Onboarding checklist |

## Authority order
See `CLAUDE.md` §2 for the full authority order. In summary: law > Master Project Document v5.0 > explicit later founder-approved written decisions > approved legal/compliance decisions > approved financial/security specifications > current architecture/database/API specifications > current UI/UX specifications > current automation specifications > existing code > developer assumptions > AI suggestions.

## Superseded documents

| Superseded doc | Replaced by | Date | Reason |
|---|---|---|---|
| `CLAUDE.md` v2.0 (moved to `docs/99-superseded/CLAUDE_v2.0.md`) | `CLAUDE.md` v5.0 | 2026-09-07 | Founder supplied a v5.0 Master Project Document + CLAUDE.md; founder approved adopting v5.0 as authoritative (see Decision Log). |
| `docs/00-ssot/TRUSTMART_SSOT_v2.0.md` (moved to `docs/99-superseded/TRUSTMART_SSOT_v2.0.md`) | Master Project Document v5.0 (PDF) | 2026-09-07 | Same as above — v5.0's Master Project Document now plays the role the SSOT v2.0 played. |
