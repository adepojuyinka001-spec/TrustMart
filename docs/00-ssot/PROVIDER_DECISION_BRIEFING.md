# TrustMart — Provider Decision Briefing

**Purpose:** research and options to support the founder in resolving Open Decisions #1 (payment/escrow provider) and #5 (KYC/KYB provider) in `OPEN_DECISIONS.md`. **This document does not select a provider or propose a legal structure** — per CLAUDE.md §16/§46, that decision belongs to the founder, with legal/compliance sign-off, not to Claude Code. Everything below is informational: current as of the research date, drawn from public sources, and **not legal advice**. Confirm every regulatory claim with Nigerian legal/compliance counsel before acting on it.

**Research date:** 2026-09-17. Fintech/regulatory landscapes move fast — re-verify pricing, licensing status, and product availability directly with each provider before signing anything.

**How to use this doc:** read it, discuss with legal counsel, then tell Claude Code which option (or combination) you've chosen. That gets recorded as a dated, founder-approved entry in `DECISION_LOG.md` and removed from `OPEN_DECISIONS.md`, per the process both files already describe. Edit this file directly (or ask Claude Code to) as your own research adds to it — it's a normal tracked file in the repo, same as the other `docs/00-ssot/` files.

---

## 1. The regulatory shape of the problem (Nigeria)

A few structural facts worth understanding before comparing named providers:

- **There is no standalone "Escrow License" issued by the Central Bank of Nigeria (CBN).** Escrow-like services in Nigeria currently operate under the general Payment Service Provider (PSP) licensing framework, not a purpose-built escrow category.
- **Holding customer funds requires more than the entry-level license.** A **Payment Solution Service Provider (PSSP)** license — the common starting license for payment-facing startups — authorizes running a payment gateway/checkout and merchant aggregation, but explicitly **does not** authorize holding customer funds or issuing wallets. Actually holding funds (which is what "escrow" means in practice) needs either a higher-tier CBN license (e.g. Switching & Processing, Mobile Money Operator, or Payment Service Bank — these carry materially larger capital requirements, reported in the ₦2 billion+ range for some categories) **or** a partnership with an already-licensed deposit-taking institution (a licensed Microfinance Bank or commercial bank) that holds the funds on TrustMart's behalf.
- **The realistic near-term paths, in increasing order of how much TrustMart itself has to become a licensed financial institution:**
  1. **Integrate a third-party escrow-as-a-service provider** that already has the licensing/bank-partnership in place (TrustMart never touches money directly — it calls their API to create/fund/release an escrow). Fastest to build, least regulatory exposure, but TrustMart is dependent on that provider's reliability, pricing, and continued licensing status.
  2. **Build escrow logic on top of a general payment gateway's transfer/split APIs** (e.g. Paystack subaccounts + Transfers API, or Flutterwave's dedicated escrow endpoints), with TrustMart itself never holding funds — money moves gateway → destination directly, with TrustMart only controlling *when* a transfer/split fires. Still doesn't require TrustMart to hold a money-transmission license, but requires more custom engineering (hold windows, dispute logic) than option 1.
  3. **TrustMart becomes directly licensed** (or partners at a deeper level with a licensed bank/MFB to hold funds in a dedicated account structure). Most control, most expensive, most regulatory burden — realistically a later-stage move once transaction volume justifies it, not an MVP starting point.
- This structural question (which path, 1/2/3 above) is arguably prior to *which specific company* — it shapes the legal customer-funds structure CLAUDE.md §16 requires be resolved before any live funds-flow work.

## 2. Payment / Escrow provider options (Open Decision #1)

### 2a. Purpose-built escrow-as-a-service (Path 1 above)

| Provider | What they offer | Notes |
|---|---|---|
| **Flutterwave — Escrow Payments API** | A dedicated escrow product with hold/settle endpoints (create an escrow-flagged transaction, later call a settlement endpoint to release funds). Part of Flutterwave's broader payments platform, which already processes for Uber, Bolt, Binance in Africa. Flutterwave obtained a CBN national microlender license in April 2026, letting it hold customer deposits directly. | Backed by an established, well-capitalized, already-licensed player — likely the lowest platform-risk option among the escrow-specific products found. Confirm current escrow API pricing/limits/documentation directly (`developer.flutterwave.com`). |
| **EscrowPay** | Newer, Nigeria-focused escrow API; live with consumers since mid-2026. Funds are explicitly held by Rubies MFB, a CBN-licensed microfinance bank — i.e. EscrowPay operates via a bank partnership rather than holding a deposit-taking license itself. | Purpose-built for exactly this "buyer pays in, seller confirms delivery, funds release" flow. Newer/smaller than Flutterwave — weigh operational track record and financial stability before committing meaningful volume. |
| **Pandascrow** | Describes itself as Nigeria's largest digital escrow platform, with developer APIs. | Another dedicated-escrow option; verify current API maturity, documentation quality, and actual transaction volume/uptime track record directly. |
| **Payluk** | REST API marketplace/e-commerce-focused escrow product. | Smaller/newer; same due-diligence caveat as above. |

### 2b. General payment gateway + custom hold logic (Path 2 above)

| Provider | What they offer | Notes |
|---|---|---|
| **Paystack** (acquired by Stripe, 2020; also obtained a Nigerian microfinance banking license in early 2026) | **Split Payments**: a transaction is split between TrustMart's main account and a seller's **subaccount** at time of settlement, on Paystack's normal settlement cycle. Also has a standalone **Transfers API** for programmatic payouts. | Split Payments alone settles on the *normal* cycle, not "hold until buyer confirms" — true escrow behavior would need to be built on top (e.g. hold the transfer/split trigger server-side until TrustMart's own Escrow state machine reaches RELEASE, then call the Transfers API). Very mature, well-documented API and large Nigerian developer ecosystem — most implementation risk is on TrustMart's own custom hold logic, not the provider. |
| **Korapay (Kora)** | Developer-focused Nigerian gateway, notably strong for USD collection. | No dedicated escrow product surfaced in this research — same "build the hold logic yourself on top of transfers" profile as Paystack, unconfirmed. Verify directly. |

### What this means practically
- If minimizing custom engineering and regulatory surface matters most: a dedicated escrow API (2a) is the more turn-key path — TrustMart's `EscrowService` state machine (already built, non-financial, in `apps/api/src/modules/escrow`) would gain a funding/release integration layer calling that provider's API, without TrustMart ever holding customer money.
- If deeper long-term control (fee structure, data, no third-party dependency) matters more, and the team is willing to build/maintain custom hold logic: a general gateway (2b) plus TrustMart's own logic is the other realistic path — but this still needs a legal read on whether TrustMart's own transient handling of the transfer trigger constitutes "holding funds" in a way that needs its own licensing.
- Either way, **the actual legal customer-funds structure question (which CLAUDE.md §16 requires resolved before live funds-flow work) needs a lawyer's sign-off specific to whichever path is chosen** — this document identifies the shape of the choice, not the legal answer.

## 3. KYC / KYB provider options (Open Decision #5)

`VerificationCase` already exists as a provider-agnostic status shell (built in Shared Core) — whichever provider is chosen plugs into it without a schema change.

| Provider | What they offer | Notes |
|---|---|---|
| **Smile ID** | Broadest pan-African coverage (all 54 African countries), covers both individual KYC (document verification, biometric auth, phone/bank-account verification) and **business verification (KYB)** — relevant since TrustMart's `Business`/`BusinessStaff` entities will eventually need business-side verification too, not just individual sellers/buyers. | Good fit if TrustMart expects to expand beyond Nigeria later, or needs KYB (not just individual KYC) soon. |
| **Dojah** | Nigeria-focused, ISO 27001/22301/20000 certified, NDPR (Nigeria Data Protection Regulation) compliant. | Narrower geographic focus but deep Nigeria-specific coverage; worth comparing ID-type coverage (NIN, BVN, voter's card, etc.) directly against Smile ID/QoreID for Nigeria specifically. |
| **Prembly** | API + no-code verification flows, plus background checks beyond standard KYC. | Useful if TrustMart wants background-check-style checks (not just identity match) for higher-risk categories (e.g. Real Estate sellers) later. |
| **QoreID** | Real-time identity checks against 100M+ government-approved ID records (Nigeria + beyond). | Another strong Nigeria-first option; compare live/real-time latency and specific record-source coverage against Dojah. |

All four are viable, established players — no obvious disqualifying weakness surfaced in this pass. The practical differentiators are: pricing per verification, exact ID-type/database coverage for Nigeria, whether KYB (business verification) is needed now or can wait, and each provider's own API documentation/reliability track record, which is worth a hands-on trial (most offer sandbox/test-mode access) before committing.

## 4. Suggested next steps (process, not a decision)

1. Pick 2–3 candidates from Section 2 (and separately, Section 3) worth a real conversation — sandbox access, a call with their sales/integration team, and current pricing.
2. Get the legal customer-funds structure question (Section 1) in front of counsel alongside whichever payment path looks most appealing — the two questions are linked, not sequential.
3. Once you have an actual decision (not just a leaning), tell Claude Code — it gets written up as a dated `DECISION_LOG.md` entry with the reasoning, `OPEN_DECISIONS.md` gets updated, and the real integration work (Phase 6: wiring `PaymentRecord`/`WebhookEvent`/the `LedgerService` that's already built to a real provider) can start.

## 5. Sources consulted

- [CBN fintech regulations 2026: Licensing & compliance guide — Techpoint Africa](https://techpoint.africa/guide/cbn-fintech-regulations/)
- [How to Obtain a Payment Solution Service Providers Licence in Nigeria — Legal500](https://www.legal500.com/developments/thought-leadership/how-to-obtain-a-payment-solution-service-providers-licence-in-nigeria-2/)
- [Types of Fintech Licenses Required for Operation in Nigeria — Legal500](https://www.legal500.com/developments/thought-leadership/types-of-fintech-licenses-required-for-operation-in-nigeria/)
- [Fintech Licence Requirements in Nigeria (2026) — Lawzana](https://lawzana.com/articles/nigeria/fintech-licence-requirements-in-nigeria-2026-capital-fees-cbn-process-960)
- [Escrow Payments in Nigeria — Marketplace Naija](https://www.marketplace.ng/blog/escrow-payments-in-nigeria-the-ultimate-guide-to-safe-online-transactions)
- [Flutterwave Escrow Payments API docs](https://developer.flutterwave.com/v2.0/docs/escrow-payments)
- [Flutterwave — Wikipedia](https://en.wikipedia.org/wiki/Flutterwave)
- [Pandascrow: Nigeria's Biggest Digital Escrow](https://pandascrow.io/blog/pandascrow-nigeria-biggest-digital-escrow)
- [EscrowPay API](https://escrowpay.app/api)
- [Payluk](https://payluk.ng/)
- [Paystack Split Payments documentation](https://paystack.com/docs/payments/split-payments/)
- [Paystack Multi-split Payments documentation](https://paystack.com/docs/payments/multi-split-payments/)
- [Best Identity Verification API in Africa 2026 — Dojah](https://dojah.io/blog/best-identity-verification-api-africa-2026)
- [Top 6 best KYC and Identity verification providers in Africa — Kora](https://www.korahq.com/blog/best-kyc-verification-providers)
- [Smile ID — Business Verification (KYB)](https://docs.usesmileid.com/products/for-businesses-kyb/business-verification)
- [Smile ID — Nigeria](https://usesmileid.com/countries/nigeria/)
- [Prembly](https://prembly.com/)
- [Online Payment Gateways in Nigeria — 2026 Update](https://pishondesigns.org/Dbase/6-top-online-payment-gateways-in-nigeria-2/)
