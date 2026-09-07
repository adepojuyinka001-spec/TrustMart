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
}
