"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../../lib/api";
import type { AnalyticsOverview } from "../../../lib/types";
import { useAuth } from "../../../lib/auth-context";
import { RequirePermission } from "../../../components/RequirePermission";
import { Topbar } from "../../../components/Topbar";
import { StatCard } from "../../../components/StatCard";
import { StatusBadge } from "../../../components/StatusBadge";
import { ClipboardIcon, GiftIcon, ShieldIcon, TagIcon, UsersIcon } from "../../../components/icons";

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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<AnalyticsOverview>("/admin/analytics/overview", token)
      .then(setOverview)
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
