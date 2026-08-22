# TrustMart Open Decisions

Unresolved questions that block or materially affect implementation. Move an entry to `DECISION_LOG.md` once resolved and approved.

| # | Question | Why it matters | Status | Owner |
|---|---|---|---|---|
| 1 | Which payment/escrow provider(s) will hold customer funds, and under what licensed/regulated structure? | SSOT §11 and CLAUDE.md §16 both block live funds-flow work until this is legally confirmed. | Open | Founder / Legal |
| 2 | Which identity/auth provider (e.g. self-hosted vs. managed) backs the Shared Core identity abstraction? | Determines the auth provider abstraction built in Shared Core. | Open | Founder |
| 3 | Hosted vs. self-hosted Postgres and n8n for the first deployed (non-local) environment? | Affects infra cost and Docker Compose vs. managed-service setup. | Open (local Docker chosen for dev) | Founder |
| 4 | Exact initial category list beyond the rollout order (Real Estate, Vehicles, Travel, Import/Export)? | Needed to seed Category/Subcategory/AttributeDefinition data. | Open | Founder |

## How to use this file
1. Add a row when a real ambiguity blocks a build-plan decision.
2. Never resolve fee/reward/legal/provider questions by assumption — per `CLAUDE.md` §16, stop and ask.
3. Once approved, move the resolved item into `DECISION_LOG.md` with the date and remove it from this table.
