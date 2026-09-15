import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

// Read-only aggregate counts across what's actually built so far (CLAUDE.md SS25/SS35:
// Admin Control Centre + Analytics). Deliberately simple counts/group-bys, not the full
// funnel (Visitor -> Registered -> ... -> Repeat) — that needs event-timestamp analysis
// not wired yet. No financial figures here (GMV, subscription revenue, Escrow value) since
// none of that exists in a completed/paid state yet.
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

  // CLAUDE.md SS36: "Build internal analytics capable of detecting demand/supply
  // imbalances by category, subcategory, geography, budget/price range, buyer criteria...
  // The system may recommend targeted seller acquisition." Geography is deliberately
  // supply-side only (Listing.state is a clean, groupable column) — BuyerRequest only
  // stores `preferredLocations` as a free-text JSON array, and aggregating that into
  // per-location buyer counts would mean fuzzy-matching short, small-sample strings that
  // could end up singling out an individual buyer's stated location, which SS36 itself
  // warns against ("Do not expose sensitive individual buyer intent in management
  // summaries unnecessarily"). Classification thresholds (ratio >= 2 / <= 0.5) are a
  // presentation heuristic to make an already-computed ratio scannable, not a business
  // rule — CLAUDE.md SS39 lists "final moderation thresholds" as unresolved, and this
  // isn't one of those anyway since nothing acts on the label automatically.
  async getLiquidity() {
    const [buyerRequestCounts, listingCounts, listingsByLocation] = await Promise.all([
      this.prisma.buyerRequest.groupBy({ by: ["subcategoryId"], where: { status: "ACTIVE" }, _count: { _all: true } }),
      this.prisma.listing.groupBy({ by: ["subcategoryId"], where: { status: "ACTIVE" }, _count: { _all: true } }),
      this.prisma.listing.groupBy({
        by: ["subcategoryId", "state"],
        where: { status: "ACTIVE", state: { not: null } },
        _count: { _all: true },
      }),
    ]);

    const subcategoryIds = Array.from(
      new Set([...buyerRequestCounts.map((r) => r.subcategoryId), ...listingCounts.map((r) => r.subcategoryId)]),
    );
    const subcategories = await this.prisma.subcategory.findMany({
      where: { id: { in: subcategoryIds } },
      include: { category: true },
    });
    const subcategoryById = new Map(subcategories.map((s) => [s.id, s]));

    const demandBySubcategory = new Map(buyerRequestCounts.map((r) => [r.subcategoryId, r._count._all]));
    const supplyBySubcategory = new Map(listingCounts.map((r) => [r.subcategoryId, r._count._all]));

    const locationsBySubcategory = new Map<string, Array<{ location: string; listingCount: number }>>();
    for (const row of listingsByLocation) {
      if (!row.state) continue;
      const list = locationsBySubcategory.get(row.subcategoryId) ?? [];
      list.push({ location: row.state, listingCount: row._count._all });
      locationsBySubcategory.set(row.subcategoryId, list);
    }

    const rows = subcategoryIds
      .map((id) => {
        const subcategory = subcategoryById.get(id);
        if (!subcategory) return null;
        const demand = demandBySubcategory.get(id) ?? 0;
        const supply = supplyBySubcategory.get(id) ?? 0;
        const ratio = supply > 0 ? Math.round((demand / supply) * 100) / 100 : null;

        let classification: "UNDERSUPPLIED" | "OVERSUPPLIED" | "BALANCED";
        if (supply === 0 && demand > 0) classification = "UNDERSUPPLIED";
        else if (demand === 0 && supply > 0) classification = "OVERSUPPLIED";
        else if (ratio !== null && ratio >= 2) classification = "UNDERSUPPLIED";
        else if (ratio !== null && ratio <= 0.5) classification = "OVERSUPPLIED";
        else classification = "BALANCED";

        return {
          subcategoryId: id,
          subcategoryLabel: subcategory.label,
          categoryLabel: subcategory.category.label,
          activeBuyerRequests: demand,
          activeListings: supply,
          demandToSupplyRatio: ratio,
          classification,
          topSupplyLocations: (locationsBySubcategory.get(id) ?? [])
            .sort((a, b) => b.listingCount - a.listingCount)
            .slice(0, 5),
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null && (r.activeBuyerRequests > 0 || r.activeListings > 0))
      .sort((a, b) => b.activeBuyerRequests - a.activeBuyerRequests);

    return { subcategories: rows };
  }
}
