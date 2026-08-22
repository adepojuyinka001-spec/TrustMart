# TrustMart Risk Register

Tracks known security, financial, compliance, and operational risks. Update whenever a new risk is identified (e.g. during an adversarial review pass) or an existing one changes status.

| # | Risk | Category | Severity | Mitigation | Status |
|---|---|---|---|---|---|
| 1 | Live customer-funds flow implemented before a qualified legal/provider structure is approved | Legal / Financial | Critical | Blocked by design — CLAUDE.md §16 requires stop-and-ask; no live provider funding until approved (see Open Decision #1) | Open — mitigated by process gate |
| 2 | Confidential reward/referral rates (0.3% / 0.1% / 0.1%) leaking into customer-facing APIs, frontend bundles, logs, or AI responses | Confidentiality | High | RBAC-gated `RewardPolicyVersion`; explicit leakage tests required per Prompt — Confidential Rewards | Open — to be tested when Rewards module is built |
| 3 | Buyer contact info exposed via subscription alone, without consent/entitlement check | Privacy | High | Contact access requires subscription + consent + valid interest/lead context + audit (CLAUDE.md §5) | Open — to be tested when Contact Access module is built |
| 4 | n8n or AI granted ability to write financial tables, set Escrow/payment status, or move funds | Financial integrity | Critical | Backend-only financial writes; n8n/AI call authenticated APIs only, never direct DB access (CLAUDE.md §11–12) | Open — enforce at Shared Core + Escrow build time |
| 5 | Matching threshold/weights or listing lifecycle/pricing hard-coded instead of configurable | Business flexibility | Medium | PlatformConfiguration-driven values, no hard-coded constants (CLAUDE.md §4) | Open — enforce at Marketplace Core build time |
| 6 | Payment marked successful from unverified signal (screenshot, claim, unverified webhook) | Financial integrity | Critical | Mandatory provider verification pipeline before ledger posting (CLAUDE.md §9) | Open — enforce at Finance/Payments build time |

## How to use this file
- Add rows as risks are identified, especially during the "Adversarial Review" prompt pass.
- Never close a Critical/High risk without a corresponding regression test.
