# TrustMart Master Document Register

Tracks every current authoritative document and its status. Update whenever a document is added, superseded, or replaced. Superseded documents move to `docs/99-superseded/` and get an entry here noting what replaced them.

| Doc | Path | Version | Status | Notes |
|---|---|---|---|---|
| Root Claude instructions | `CLAUDE.md` | v2.0 | Current | Authoritative root instruction file |
| Single Source of Truth | `docs/00-ssot/TRUSTMART_SSOT_v2.0.md` | v2.0 | Current | Highest-priority business/product authority after law |
| Master Document Register | `docs/00-ssot/MASTER_DOCUMENT_REGISTER.md` | — | Current | This file |
| Open Decisions | `docs/00-ssot/OPEN_DECISIONS.md` | — | Current | Unresolved questions blocking implementation |
| Implementation Status | `docs/00-ssot/IMPLEMENTATION_STATUS.md` | — | Current | What is actually built, by module |
| Decision Log | `docs/00-ssot/DECISION_LOG.md` | — | Current | Append-only record of approved decisions |
| Risk Register | `docs/00-ssot/RISK_REGISTER.md` | — | Current | Tracked security/financial/compliance risks |
| Marketplace Technical Architecture & Database Blueprint | `docs/02-architecture/TRUSTMART_MARKETPLACE_TECHNICAL_ARCHITECTURE_AND_DATABASE_BLUEPRINT_v1.0.md` | v1.0 | Current | Implementation-ready architecture |
| Claude Code Master Prompts | `docs/09-prompts/CLAUDE_CODE_MASTER_PROMPTS.md` | v2.0 | Current | Reusable prompts for each build phase |
| Start Here Checklist | `docs/START_HERE_CHECKLIST.md` | v2.0 | Current | Onboarding checklist |

## Authority order
See `CLAUDE.md` §14 for the full authority order. In summary: law > SSOT > approved legal/compliance decisions > approved financial/business rules > approved Marketplace Technical Blueprint > approved Escrow rules > approved architecture/security/data ADRs > approved UI/UX/copy specs > approved automation specs > current code > developer assumptions > AI suggestions.

## Superseded documents
None yet. When a document is superseded, move it into `docs/99-superseded/` and record it below.

| Superseded doc | Replaced by | Date | Reason |
|---|---|---|---|
| — | — | — | — |
