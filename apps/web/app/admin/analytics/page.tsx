"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../../lib/api";
import type { AnalyticsOverview, LiquiditySnapshot, MarketplaceFunnel } from "../../../lib/types";
import { useAuth } from "../../../lib/auth-context";
import { RequirePermission } from "../../../components/RequirePermission";
import { Topbar } from "../../../components/Topbar";
import { StatCard } from "../../../components/StatCard";
import { StatusBadge } from "../../../components/StatusBadge";
import { ClipboardIcon, GiftIcon, ShieldIcon, TagIcon, UsersIcon } from "../../../components/icons";

// CLAUDE.md SS35's Marketplace funnel, using only what's actually trackable today
// (Visitor has no page-view analytics; Reward/Service Review need a completed Escrow,
// which doesn't exist yet). Bar widths are relative to the first stage's count.
function FunnelChart({ funnel }: { funnel: MarketplaceFunnel }) {
  const baseline = funnel.stages[0]?.count ?? 0;
  return (
    <div className="tm-card space-y-3">
      <h2 className="font-semibold text-tm-navy">Marketplace Funnel</h2>
      <div className="space-y-2.5">
        {funnel.stages.map((stage) => {
          const widthPercent = stage.count === null || baseline === 0 ? 0 : Math.max(4, (stage.count / baseline) * 100);
          return (
            <div key={stage.key}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium text-tm-dark/80">{stage.label}</span>
                <span className="text-tm-dark/50">
                  {stage.count === null ? (
                    "Not tracked yet"
                  ) : (
                    <>
                      {stage.count.toLocaleString()}
                      {stage.conversionFromPrevious !== null && (
                        <span className="ml-1.5 text-tm-navy">({stage.conversionFromPrevious}%)</span>
                      )}
                    </>
                  )}
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full border border-dashed border-tm-navy/15 bg-tm-navy/5">
                {stage.count !== null && (
                  <div className="h-full rounded-full bg-tm-gold" style={{ width: `${widthPercent}%` }} />
                )}
              </div>
              {stage.note && <p className="mt-1 text-[11px] text-tm-dark/40">{stage.note}</p>}
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-tm-dark/40">
        Stages aren&apos;t a strict per-user sequence — e.g. a buyer can express interest by browsing directly,
        without a matching buyer request, so Interest can exceed Match.
      </p>
    </div>
  );
}

const CLASSIFICATION_STYLE: Record<string, string> = {
  UNDERSUPPLIED: "bg-amber-100 text-amber-800",
  OVERSUPPLIED: "bg-blue-100 text-blue-800",
  BALANCED: "bg-emerald-100 text-emerald-800",
};

// CLAUDE.md SS36 Liquidity Intelligence: demand (active buyer requests) vs. supply (active
// listings) per subcategory. Geography is supply-side only — see the backend's own comment
// (analytics.service.ts) for why buyer-side geography isn't broken out here.
function LiquidityTable({ liquidity }: { liquidity: LiquiditySnapshot }) {
  if (liquidity.subcategories.length === 0) {
    return (
      <div className="tm-card">
        <h2 className="font-semibold text-tm-navy">Liquidity Intelligence</h2>
        <p className="mt-4 text-sm text-tm-dark/60">No active buyer requests or listings yet.</p>
      </div>
    );
  }

  return (
    <div className="tm-card overflow-x-auto p-0">
      <div className="border-b border-tm-navy/10 px-5 py-4">
        <h2 className="font-semibold text-tm-navy">Liquidity Intelligence</h2>
        <p className="mt-1 text-xs text-tm-dark/50">Demand vs. supply by subcategory — where to focus seller acquisition.</p>
      </div>
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-tm-navy/10 text-xs uppercase tracking-wide text-tm-dark/50">
          <tr>
            <th className="px-5 py-3 font-semibold">Subcategory</th>
            <th className="px-5 py-3 font-semibold">Demand</th>
            <th className="px-5 py-3 font-semibold">Supply</th>
            <th className="px-5 py-3 font-semibold">Ratio</th>
            <th className="px-5 py-3 font-semibold">Status</th>
            <th className="px-5 py-3 font-semibold">Top supply locations</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-tm-navy/5">
          {liquidity.subcategories.map((row) => (
            <tr key={row.subcategoryId}>
              <td className="px-5 py-3">
                <p className="font-medium text-tm-dark">{row.subcategoryLabel}</p>
                <p className="text-xs text-tm-dark/40">{row.categoryLabel}</p>
              </td>
              <td className="px-5 py-3 text-tm-dark/80">{row.activeBuyerRequests}</td>
              <td className="px-5 py-3 text-tm-dark/80">{row.activeListings}</td>
              <td className="px-5 py-3 text-tm-dark/80">{row.demandToSupplyRatio ?? "—"}</td>
              <td className="px-5 py-3">
                <span className={`tm-badge ${CLASSIFICATION_STYLE[row.classification]}`}>{row.classification}</span>
              </td>
              <td className="px-5 py-3 text-xs text-tm-dark/60">
                {row.topSupplyLocations.length === 0
                  ? "—"
                  : row.topSupplyLocations.map((l) => `${l.location} (${l.listingCount})`).join(", ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBreakdown({ title, byStatus }: { title: string; byStatus: Record<string, number> }) {
  const entries = Object.entries(byStatus);
  return (
    <div className="tm-card">
      <h2 className="font-semibold text-tm-navy">{title}</h2>
      {entries.length === 0 ? (
        <p className="mt-4 text-sm text-tm-dark/60">No data yet.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {entries.map(([status, count]) => (
            <div key={status} className="flex items-center justify-between">
              <StatusBadge status={status} />
              <span className="text-sm font-semibold text-tm-dark">{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminAnalytics() {
  const { token } = useAuth();
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [funnel, setFunnel] = useState<MarketplaceFunnel | null>(null);
  const [liquidity, setLiquidity] = useState<LiquiditySnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<AnalyticsOverview>("/admin/analytics/overview", token),
      api.get<MarketplaceFunnel>("/admin/analytics/funnel", token),
      api.get<LiquiditySnapshot>("/admin/analytics/liquidity", token),
    ])
      .then(([overviewRes, funnelRes, liquidityRes]) => {
        setOverview(overviewRes);
        setFunnel(funnelRes);
        setLiquidity(liquidityRes);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load analytics."))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <>
      <Topbar title="Admin — Analytics" subtitle="Read-only platform overview across what's built so far" />
      <main className="flex-1 space-y-6 bg-tm-navy/[0.02] p-6">
        <Link href="/admin/audit" className="text-sm font-medium text-tm-navy hover:text-tm-gold">
          View audit log →
        </Link>

        {loading ? (
          <p className="text-sm text-tm-dark/60">Loading…</p>
        ) : error ? (
          <p className="text-sm text-red-700">{error}</p>
        ) : overview ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={<UsersIcon className="h-5 w-5" />} label="Total Users" value={overview.users.total} tone="navy" />
              <StatCard
                icon={<ClipboardIcon className="h-5 w-5" />}
                label="Interests"
                value={overview.interests.total}
                tone="gold"
              />
              <StatCard
                icon={<ShieldIcon className="h-5 w-5" />}
                label="Match Qualification Rate"
                value={overview.matching.qualificationRate !== null ? `${overview.matching.qualificationRate}%` : "—"}
                hint={`${overview.matching.qualified} of ${overview.matching.totalRuns} qualified`}
                tone="purple"
              />
              <StatCard
                icon={<GiftIcon className="h-5 w-5" />}
                label="Active Subscription Plans"
                value={overview.subscriptions.activePlans}
                tone="green"
              />
            </div>

            {funnel && <FunnelChart funnel={funnel} />}

            {liquidity && <LiquidityTable liquidity={liquidity} />}

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <StatusBreakdown title="Listings" byStatus={overview.listings.byStatus} />
              <StatusBreakdown title="Buyer Requests" byStatus={overview.buyerRequests.byStatus} />
              <StatusBreakdown title="Leads" byStatus={overview.leads.byStatus} />
              <StatusBreakdown title="Escrows" byStatus={overview.escrows.byStatus} />
              <div className="tm-card">
                <h2 className="font-semibold text-tm-navy">Referrals</h2>
                {Object.keys(overview.referrals.byType).length === 0 ? (
                  <p className="mt-4 text-sm text-tm-dark/60">No data yet.</p>
                ) : (
                  <div className="mt-4 space-y-2">
                    {Object.entries(overview.referrals.byType).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="tm-badge bg-tm-navy/10 text-tm-navy">{type.replace(/_/g, " ")}</span>
                        <span className="text-sm font-semibold text-tm-dark">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <p className="text-xs text-tm-dark/40">
              <TagIcon className="mr-1 inline h-3.5 w-3.5 align-text-bottom" />
              No financial figures shown here (GMV, subscription revenue, Escrow value) — none of that exists in a
              completed/paid state yet.
            </p>
          </>
        ) : null}
      </main>
    </>
  );
}

export default function AdminAnalyticsPage() {
  return (
    <RequirePermission permission="analytics:read">
      <AdminAnalytics />
    </RequirePermission>
  );
}
