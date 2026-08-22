# TrustMart Claude Code Master Prompts

## Prompt 0 — Repository Discovery

```text
Read CLAUDE.md, docs/00-ssot/TRUSTMART_SSOT_v2.0.md and the complete docs tree.

Do not edit code yet.

Inventory:
- repository structure;
- current source modules;
- Prisma schema/migrations;
- tests;
- n8n workflows;
- current and superseded documents;
- conflicts;
- missing dependencies;
- security/financial risks;
- open decisions.

Confirm in your own words:
1. Marketplace and Escrow are sibling products.
2. Marketplace does not require Escrow.
3. Escrow works for direct/external deals.
4. Marketplace seller subscriptions monetize opportunity/contact access.
5. Buyer contact access requires consent + entitlement.
6. Matching uses deterministic backend rules with configurable hard/weighted criteria.
7. 70% is a configurable initial match threshold.
8. 14 days is a configurable initial listing lifecycle.
9. 2.5% Escrow fee is configurable and fee responsibility can be buyer/seller/shared.
10. Referral/appreciation percentages are confidential staff-only policy.
11. Company Referral applies without valid external referral.
12. Eligible completed Escrow triggers rewards and service-review requests.
13. In-app/email/approved WhatsApp review requests are required.
14. Ledger is financial truth.
15. n8n and AI cannot control money.

Then propose the implementation plan and wait for approval.
```

## Prompt — Shared Core

```text
Implement TrustMart Shared Core after reading CLAUDE.md and SSOT.

Scope:
- identity/auth provider abstraction;
- User/Profile;
- Business/Staff;
- RBAC;
- configuration;
- audit;
- consent/notification preferences;
- verification foundation.

Do not implement Marketplace matching, Escrow money movement or providers yet.

Plan first. Include schema, APIs, authorization, audit events and tests. Wait for approval.
```

## Prompt — Marketplace Core

```text
Implement:
- Category/Dynamic Attribute Engine;
- Listing Engine;
- Buyer Request Engine;
- backend Matching Engine.

Non-negotiable:
- hard requirements filter first;
- weighted scoring is deterministic and reproducible;
- threshold/weights configurable;
- criterion-level explanation data persisted;
- AI not authoritative for score;
- buyer confirms AI-parsed request before activation.

Do not build subscription/contact/Escrow yet.
Plan first and wait for approval.
```

## Prompt — Interest / Contact / Subscription

```text
Implement Marketplace Interest, Lead, Contact Consent/Access, Subscription Plan/Entitlement and Subscription Lifecycle.

Rules:
- subscription alone cannot reveal buyer contact;
- buyer consent/privacy controls apply;
- contact reveal is audited;
- plan/pricing values are configuration;
- do not force Escrow;
- provide optional Escrow CTA/demo hooks.

Add privacy and authorization negative tests.
```

## Prompt — Standalone Escrow

```text
Implement standalone TrustMart Escrow as an independent product.

Origins include DIRECT and MARKETPLACE.

Implement:
- parties;
- versioned terms;
- acceptance;
- conditions;
- fee allocation;
- origin source;
- state transitions.

Current 2.5% fee is configuration.
Support buyer-pays, seller-pays and approved shared allocation.

Marketplace is not required.
Do not implement live provider funding until approved.
```

## Prompt — Confidential Rewards

```text
Implement referral/appreciation reward policy with strict confidentiality.

Requirements:
- internal versioned policy stores exact rates;
- only authorized staff can read rate fields;
- customer/referrer APIs return earned amount/status, never rate/formula;
- Company Referral when no valid external referrer;
- eligible completed Escrow only;
- no reward under dispute/fraud/reversal/cancellation;
- ledger-backed reward credit;
- configurable short settlement delay;
- test API responses, logs and client DTOs for leakage.

Never expose exact percentages in frontend, notifications, support or AI.
```

## Prompt — Reviews

```text
Implement TrustMart service-review automation after eligible completed Escrow.

Requirements:
- buyer and seller review requests;
- in-app, email and approved/consented WhatsApp;
- configurable timing/reminders;
- overall rating + written feedback;
- optional service dimensions;
- low-rating service-recovery case;
- preserve original review;
- analytics-ready fields.

Keep service feedback separate from future buyer/seller reputation reviews.
```

## Prompt — Adversarial Review

```text
Act as a fintech + marketplace security reviewer.

Do not add features.

Try to break:
- RBAC/IDOR;
- contact privacy;
- subscription entitlement;
- matching manipulation;
- listing moderation;
- payment verification;
- webhook idempotency;
- Escrow transitions;
- fee allocation;
- ledger invariants;
- reward confidentiality;
- Company Referral;
- n8n/AI boundaries;
- review integrity;
- audit logs.

For every issue give severity, exploit, impact, affected files, fix and regression test.

Wait for approval before remediation.
```
