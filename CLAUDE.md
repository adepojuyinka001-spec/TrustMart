# TRUSTMART LIMITED — CLAUDE.md v2.0

Project: TrustMart Limited
Brand: TrustMart
Master brand line: Securing Transactions. Building Trust.

## 1. Purpose
This is the root instruction file for Claude Code. Before editing code, schema, workflows, infrastructure or specifications:
1. Read this file.
2. Read `docs/00-ssot/TRUSTMART_SSOT_v2.0.md`.
3. Read `docs/00-ssot/MASTER_DOCUMENT_REGISTER.md`.
4. Read the relevant current specification.
5. Check `docs/00-ssot/OPEN_DECISIONS.md`, `IMPLEMENTATION_STATUS.md`, `DECISION_LOG.md`, and `RISK_REGISTER.md`.
6. State scope, assumptions, security/financial impact and planned changes before material implementation.

If a lower-priority source conflicts with a higher-priority source, stop and report the conflict.

## 2. Product model
TrustMart is one integrated Trust & Commerce Network with two sibling products:

### TrustMart Marketplace
Captures buyer intent, seller inventory, matching, interests, leads, subscriptions, re-engagement and Marketplace analytics.

Marketplace use of TrustMart Escrow is OPTIONAL. Buyer and seller may connect and complete a transaction outside TrustMart if they choose.

Seller subscription is the Marketplace monetization/access mechanism. Buyer contact disclosure additionally requires buyer consent/privacy permission and valid access context.

TrustMart should recommend Escrow at relevant moments and show an interactive "How TrustMart Escrow Works" demo and CTA such as "Secure This Deal With TrustMart Escrow."

### TrustMart Escrow / Transaction Assurance
A standalone core product. It can secure eligible deals originating from TrustMart Marketplace, WhatsApp, social media, another marketplace, offline/direct deals, partners or future APIs.

Marketplace is not required to create Escrow.

## 3. Brand identity
Do not change the approved TrustMart visual identity unless the founder explicitly changes it.
- Brand: TrustMart
- Master line: Securing Transactions. Building Trust.
- Palette: deep navy (#0B2C5F), gold (#D4A017), white (#FFFFFF), dark accent (#1A1A1A)
- Typography: Montserrat family (Bold for headings)
- Marketplace campaign language may use: Find the Deal. Secure the Transaction.
- Escrow campaign/CTA language may use: Secure the Deal.
- Escrow logo lockup tagline: We Hold. You Trust. We Deliver.
Campaign and tagline language does not replace the master brand line.

## 4. Marketplace rules
- Initial default match threshold: 70%, configurable.
- Hard requirements disqualify before weighted scoring.
- Category/subcategory matching weights are configurable.
- Matching is deterministic backend logic, not authoritative AI/n8n/frontend logic.
- Initial default listing lifecycle: 14 days, configurable.
- Initial introductory seller pricing: ₦5,000 weekly and ₦15,000 monthly, configurable.
- Plans and entitlements must not be hard-coded.

## 5. Contact privacy
Seller subscription alone must not expose buyer contact information.
Contact access requires:
- valid subscription/entitlement;
- buyer consent/contact preference;
- valid interest/lead/match context;
- server-side authorization;
- audit logging.

## 6. Escrow workflow
Standalone or Marketplace-originated Escrow uses one engine.
Suggested origins: DIRECT, MARKETPLACE, PARTNER, BUSINESS_API.
Marketplace references are optional.

Parties define and mutually accept versioned transaction terms, conditions and fee responsibility.

Current contemplated Escrow fee: 2.5% of transaction value, configurable.
Fee responsibility may be:
- buyer 100%;
- seller 100%;
- mutually agreed shared allocation.
The final funds-flow mechanics remain subject to approved legal/provider structure.

## 7. Confidential reward/referral policy
Current internal model:
- referral allocation: 0.3%;
- buyer appreciation: 0.1%;
- seller appreciation: 0.1%.

These exact percentages are STRICTLY CONFIDENTIAL INTERNAL INFORMATION.

Do not expose them to:
- customers/referrers;
- public website;
- customer-facing APIs;
- frontend bundles;
- notifications;
- support replies;
- marketing;
- AI responses;
- logs visible to unauthorized staff.

Only authorized staff may view internal rate fields according to RBAC.

Backend must calculate, ledger, reconcile and award rewards accurately using versioned internal policy.

No qualifying external referral => Company Referral.

No rewards for failed, cancelled, disputed, reversed/charged-back, fraudulent or otherwise ineligible transactions.

## 8. Reviews
After each eligible successfully completed Escrow:
- request buyer and seller TrustMart service feedback;
- use in-app, email and approved/consented WhatsApp;
- timing/reminders configurable;
- support overall rating + written review;
- optional dimensions: ease of use, trust/confidence, service satisfaction, recommend yes/maybe/no;
- low ratings may trigger service-recovery workflow.

Distinguish TrustMart service feedback from future buyer/seller reputation reviews.
AI may summarize reviews but must not alter originals.

## 9. Financial safety
Never mark payment successful because of a screenshot, customer claim, frontend state, email/SMS or unverified webhook.

Required:
1. receive provider/bank event;
2. validate authenticity/signature;
3. independently verify with provider/bank;
4. confirm amount, reference, destination and status;
5. enforce idempotency;
6. create authoritative Payment record;
7. post ledger entries atomically;
8. transition Escrow only if eligible;
9. audit;
10. notify.

The Financial Ledger is financial truth.
No silent balance edits.
No generic "Edit Balance."
Corrections use compensating/reversal entries.

## 10. Escrow state authority
The Escrow Engine is authoritative for transaction state.
Frontend, n8n, AI, support and admin interfaces cannot assign arbitrary financial states.
Material actions must respect state guards, disputes/holds, KYC/risk and maker-checker where required.

## 11. AI boundaries
AI may interpret buyer requests, draft listings, detect missing info, explain matches, summarize demand, analyze unsold inventory, triage support, summarize reviews and assist risk analysis.

AI must not independently:
- release/refund/withdraw funds;
- alter ledger balances;
- determine legal title validity;
- guarantee seller legitimacy;
- approve high-risk KYC;
- permanently determine fraud guilt;
- resolve serious disputes;
- expose confidential reward/referral policy.

Natural-language buyer requests must be confirmed by buyer before activation.

## 12. n8n boundaries
n8n orchestrates workflows and may send notifications, route support/KYC/risk cases, run reminders/re-engagement, sync analytics and call authenticated TrustMart APIs.

n8n must not:
- write financial tables directly;
- be the ledger;
- set authoritative payment status;
- set arbitrary Escrow status;
- calculate authoritative reward percentages;
- release/refund/withdraw funds.

## 13. Product delivery
Preferred MVP stack:
- VS Code + Claude Code
- private GitHub
- pnpm workspaces + Turborepo
- Next.js App Router + TypeScript
- NestJS + TypeScript
- REST/JSON + OpenAPI
- PostgreSQL
- Prisma ORM
- Docker/Compose
- n8n

Start as a disciplined modular monolith.

Build order:
1. public website;
2. Web App/PWA;
3. Admin Control Centre;
4. automation around stable APIs;
5. Android after traction;
6. iOS later.

## 14. Authority order
1. Confirmed applicable law/regulatory requirement.
2. `docs/00-ssot/TRUSTMART_SSOT_v2.0.md`.
3. Approved legal/compliance decisions.
4. Approved financial/business rules.
5. Approved Marketplace Technical Blueprint.
6. Approved Escrow rules/state machine.
7. Approved architecture/security/data ADRs.
8. Approved UI/UX/copy specs.
9. Approved automation specs.
10. Current code.
11. Developer assumptions.
12. AI suggestions.

## 15. Claude Code working method
For major changes:
1. read authoritative docs;
2. state scope and exclusions;
3. run baseline checks;
4. identify files/schema/API/workflow changes;
5. analyze authorization, idempotency, concurrency, replay, partial failure, audit, reconciliation, maker-checker, AI/n8n/admin bypass and privacy;
6. wait for approval before material architecture/business-rule changes;
7. implement smallest safe version;
8. review migrations;
9. test positive + negative paths;
10. perform adversarial review;
11. update traceability/status/decision/risk docs;
12. report next step.

## 16. Stop and ask
Stop if:
- legal customer-funds structure is unclear;
- provider choice is being invented;
- fee/reward/referral rules conflict;
- destructive migration is proposed;
- confidential percentages would reach client code;
- direct financial DB bypass is requested;
- production secret is required;
- historical posted ledger data would be altered;
- Marketplace would be made to require Escrow.

## 17. Master principle
Build one TrustMart ecosystem.

Marketplace creates opportunities.
Escrow secures eligible deals from TrustMart or elsewhere.
Marketplace Escrow is optional.
Financial truth stays in backend/ledger.
AI assists.
n8n orchestrates.
Humans remain accountable for high-risk financial, legal, fraud and dispute decisions.
