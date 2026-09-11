import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

// Read-only aggregate counts across what's actually built so far (CLAUDE.md SS25/SS35:
// Admin Control Centre + Analytics). Deliberately simple counts/group-bys, not the full
// funnel (Visitor -> Registered -> ... -> Repeat) or Liquidity Intelligence — those need
// event-timestamp analysis and demand/supply-by-geography breakdowns that aren't wired
// yet. No financial figures here (GMV, subscription revenue, Escrow value) since none of
// that exists in a completed/paid state yet.
@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const [
      totalUsers,
      listingsByStatus,
      buyerRequestsByStatus,
      totalMatches,
      qualifiedMatches,
      totalInterests,
      leadsByStatus,
      escrowsByStatus,
      activeSubscriptionPlans,
      referralsByType,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.listing.groupBy({ by: ["status"], _count: { _all: true } }),
      this.prisma.buyerRequest.groupBy({ by: ["status"], _count: { _all: true } }),
      this.prisma.match.count(),
      this.prisma.match.count({ where: { qualified: true } }),
      this.prisma.interest.count(),
      this.prisma.lead.groupBy({ by: ["status"], _count: { _all: true } }),
      this.prisma.escrowTransaction.groupBy({ by: ["status"], _count: { _all: true } }),
      this.prisma.subscriptionPlan.count({ where: { isActive: true } }),
      this.prisma.referralRelationship.groupBy({ by: ["referrerType"], _count: { _all: true } }),
    ]);

    const toCountMap = (rows: Array<Record<string, unknown> & { _count: { _all: number } }>, key: string) =>
      Object.fromEntries(rows.map((r) => [String(r[key]), r._count._all]));

    return {
      users: { total: totalUsers },
      listings: { byStatus: toCountMap(listingsByStatus, "status") },
      buyerRequests: { byStatus: toCountMap(buyerRequestsByStatus, "status") },
      matching: {
        totalRuns: totalMatches,
        qualified: qualifiedMatches,
        qualificationRate: totalMatches > 0 ? Math.round((qualifiedMatches / totalMatches) * 10000) / 100 : null,
      },
      interests: { total: totalInterests },
      leads: { byStatus: toCountMap(leadsByStatus, "status") },
      escrows: { byStatus: toCountMap(escrowsByStatus, "status") },
      subscriptions: { activePlans: activeSubscriptionPlans },
      referrals: { byType: toCountMap(referralsByType, "referrerType") },
    };
  }

  // CLAUDE.md SS35: Visitor -> Registered -> Buyer Request/Seller Listing -> Match ->
  // Interest -> Contact -> Inspection/Negotiation -> Transaction Started -> Transaction
  // Completed -> Reward -> Service Review -> Repeat. Visitor isn't trackable (no page-view
  // analytics exists) so this starts at Registered; Reward/Service Review don't exist yet
  // either (Phase 8, blocked on completed Escrow). Transaction Completed is reported as
  // `null`, not a fabricated 0 — EscrowStatus has no COMPLETED state yet (non-financial
  // scaffolding only, per the 2026-09-07 decision to defer Phase 6/7 until Open Decision #1
  // is resolved), so "0 completed transactions" would misleadingly read as "tracked, none
  // happened yet" rather than "not built yet."
  async getFunnel() {
    const [
      registered,
      listingCreators,
      buyerRequestCreators,
      qualifiedMatches,
      totalInterests,
      grantedContacts,
      transactionsStarted,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.listing.findMany({ distinct: ["sellerUserId"], select: { sellerUserId: true } }),
      this.prisma.buyerRequest.findMany({ distinct: ["buyerUserId"], select: { buyerUserId: true } }),
      this.prisma.match.count({ where: { qualified: true } }),
      this.prisma.interest.count(),
      this.prisma.contactAccessGrant.count({ where: { granted: true } }),
      this.prisma.lead.count({ where: { status: { in: ["TRANSACTION_STARTED", "WON", "LOST"] } } }),
    ]);

    const engagedUserIds = new Set([
      ...listingCreators.map((l) => l.sellerUserId),
      ...buyerRequestCreators.map((b) => b.buyerUserId),
    ]);

    const stages = [
      { key: "registered", label: "Registered", count: registered },
      { key: "listing_or_request", label: "Buyer Request / Seller Listing", count: engagedUserIds.size },
      { key: "match", label: "Match", count: qualifiedMatches },
      { key: "interest", label: "Interest", count: totalInterests },
      { key: "contact", label: "Contact", count: grantedContacts },
      { key: "transaction_started", label: "Transaction Started", count: transactionsStarted },
      {
        key: "transaction_completed",
        label: "Transaction Completed",
        count: null as number | null,
        note: "Escrow completion isn't built yet — Phase 6/7 is blocked on Open Decision #1 (payment provider).",
      },
    ];

    return {
      stages: stages.map((stage, i) => ({
        ...stage,
        conversionFromPrevious:
          i === 0 || stage.count === null || stages[i - 1].count === null || stages[i - 1].count === 0
            ? null
            : Math.round((stage.count! / stages[i - 1].count!) * 10000) / 100,
      })),
    };
  }
}
