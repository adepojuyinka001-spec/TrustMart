"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api";
import { formatMoney } from "../../lib/format";
import type { BuyerRequest, Escrow, Lead, Listing } from "../../lib/types";
import { useAuth } from "../../lib/auth-context";
import { RequireAuth } from "../../components/RequireAuth";
import { Topbar } from "../../components/Topbar";
import { StatCard } from "../../components/StatCard";
import { StatusBadge } from "../../components/StatusBadge";
import { ClipboardIcon, GiftIcon, ShieldIcon, TagIcon } from "../../components/icons";

interface ReferralInfo {
  referralCode: string;
  peopleReferred: number;
}

function Dashboard() {
  const { user, token } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [buyerRequests, setBuyerRequests] = useState<BuyerRequest[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [referral, setReferral] = useState<ReferralInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Listing[]>("/listings/mine", token),
      api.get<BuyerRequest[]>("/buyer-requests/mine", token),
      api.get<Lead[]>("/leads/mine", token),
      api.get<Escrow[]>("/escrows/mine", token),
      api.get<ReferralInfo>("/referrals/mine", token),
    ])
      .then(([l, b, ld, e, r]) => {
        setListings(l);
        setBuyerRequests(b);
        setLeads(ld);
        setEscrows(e);
        setReferral(r);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const activeListings = listings.filter((l) => l.status === "ACTIVE").length;
  const activeBuyerRequests = buyerRequests.filter((r) => r.status === "ACTIVE").length;
  const escrowsNeedingAction = escrows.filter((e) => e.status === "TERMS_PROPOSED").length;
  const activeEscrows = escrows.filter((e) => e.status === "ACCEPTED" || e.status === "TERMS_PROPOSED").length;

  return (
    <>
      <Topbar title="Dashboard" subtitle={`Welcome back, ${user?.profile?.firstName ?? "there"}`} />
      <main className="flex-1 space-y-6 bg-tm-navy/[0.02] p-6">
        {loading ? (
          <p className="text-sm text-tm-dark/60">Loading…</p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={<TagIcon className="h-5 w-5" />} label="My Listings" value={listings.length} hint={`${activeListings} active`} tone="navy" />
              <StatCard
                icon={<ClipboardIcon className="h-5 w-5" />}
                label="Buyer Requests"
                value={buyerRequests.length}
                hint={`${activeBuyerRequests} active`}
                tone="gold"
              />
              <StatCard
                icon={<ShieldIcon className="h-5 w-5" />}
                label="Escrows"
                value={escrows.length}
                hint={escrowsNeedingAction > 0 ? `${escrowsNeedingAction} awaiting your response` : `${activeEscrows} in progress`}
                tone="purple"
              />
              <StatCard icon={<GiftIcon className="h-5 w-5" />} label="People Referred" value={referral?.peopleReferred ?? 0} tone="green" />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="tm-card">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-tm-navy">Recent Escrows</h2>
                  <Link href="/escrows" className="text-sm font-medium text-tm-navy hover:text-tm-gold">
                    View all
                  </Link>
                </div>
                {escrows.length === 0 ? (
                  <p className="mt-4 text-sm text-tm-dark/60">No Escrow transactions yet.</p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {escrows.slice(0, 5).map((escrow) => (
                      <Link key={escrow.id} href={`/escrows/${escrow.id}`} className="flex items-center justify-between rounded-md border border-tm-navy/10 px-3 py-2.5 transition hover:bg-tm-navy/[0.03]">
                        <div>
                          <p className="text-sm font-semibold text-tm-dark">{escrow.title}</p>
                          <p className="text-xs text-tm-dark/60">
                            {escrow.termVersions[0] ? formatMoney(escrow.termVersions[0].transactionAmountMinorUnits, escrow.currency) : "—"}
                          </p>
                        </div>
                        <StatusBadge status={escrow.status} />
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div className="tm-card">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-tm-navy">Recent Leads</h2>
                  <Link href="/leads" className="text-sm font-medium text-tm-navy hover:text-tm-gold">
                    View all
                  </Link>
                </div>
                {leads.length === 0 ? (
                  <p className="mt-4 text-sm text-tm-dark/60">No leads yet.</p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {leads.slice(0, 5).map((lead) => (
                      <Link key={lead.id} href={`/leads/${lead.id}`} className="flex items-center justify-between rounded-md border border-tm-navy/10 px-3 py-2.5 transition hover:bg-tm-navy/[0.03]">
                        <p className="text-sm font-semibold text-tm-dark">Lead #{lead.id.slice(-8)}</p>
                        <StatusBadge status={lead.status} />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-tm-gold/30 bg-tm-navy p-6 text-tm-white">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold">Trade with confidence</h2>
                  <p className="mt-1 text-sm text-tm-white/70">
                    Escrow protects both buyers and sellers until every agreed term is met.
                  </p>
                </div>
                <Link href="/escrows" className="tm-btn-gold whitespace-nowrap">
                  Learn about Escrow
                </Link>
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <Dashboard />
    </RequireAuth>
  );
}
