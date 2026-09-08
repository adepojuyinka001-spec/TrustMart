"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../../lib/api";
import type { Lead } from "../../../lib/types";
import { useAuth } from "../../../lib/auth-context";
import { RequirePermission } from "../../../components/RequirePermission";
import { Topbar } from "../../../components/Topbar";
import { StatusBadge } from "../../../components/StatusBadge";

const STATUS_FILTERS = ["", "NEW", "VIEWED", "CONTACTED", "INSPECTION_SCHEDULED", "NEGOTIATING", "TRANSACTION_STARTED", "WON", "LOST", "SPAM_FRAUD"];
const PAGE_SIZE = 25;

function AdminLeads() {
  const { token } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("");
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ take: String(PAGE_SIZE), skip: String(skip) });
    if (status) params.set("status", status);
    api
      .get<{ items: Lead[]; total: number }>(`/admin/leads?${params.toString()}`, token)
      .then((res) => {
        setLeads(res.items);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }, [token, status, skip]);

  return (
    <>
      <Topbar title="Admin — Lead Moderation" subtitle="Every lead, not just ones you're a party to — for spam/fraud review" />
      <main className="flex-1 space-y-4 bg-tm-navy/[0.02] p-6">
        <div className="tm-card">
          <label className="block max-w-xs">
            <span className="mb-1 block text-xs font-medium text-tm-dark/60">Filter by status</span>
            <select
              value={status}
              onChange={(e) => {
                setSkip(0);
                setStatus(e.target.value);
              }}
              className="tm-select"
            >
              {STATUS_FILTERS.map((s) => (
                <option key={s} value={s}>
                  {s === "" ? "All statuses" : s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading ? (
          <p className="text-sm text-tm-dark/60">Loading…</p>
        ) : leads.length === 0 ? (
          <p className="text-sm text-tm-dark/60">No leads match this filter.</p>
        ) : (
          <div className="space-y-2">
            {leads.map((lead) => (
              <Link
                key={lead.id}
                href={`/admin/leads/${lead.id}`}
                className="tm-card flex items-center justify-between transition hover:bg-tm-navy/[0.03]"
              >
                <div>
                  <p className="text-sm font-semibold text-tm-dark">{lead.interest?.listing?.title ?? `Lead #${lead.id.slice(-8)}`}</p>
                  <p className="mt-0.5 text-xs text-tm-dark/50">
                    Buyer #{lead.buyerUserId.slice(-8)} · Seller #{lead.sellerUserId.slice(-8)} ·{" "}
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <StatusBadge status={lead.status} />
              </Link>
            ))}
          </div>
        )}

        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              disabled={skip === 0}
              onClick={() => setSkip((s) => Math.max(0, s - PAGE_SIZE))}
              className="tm-btn-outline disabled:opacity-40"
            >
              Newer
            </button>
            <p className="text-tm-dark/60">
              {skip + 1}–{Math.min(skip + PAGE_SIZE, total)} of {total}
            </p>
            <button
              type="button"
              disabled={skip + PAGE_SIZE >= total}
              onClick={() => setSkip((s) => s + PAGE_SIZE)}
              className="tm-btn-outline disabled:opacity-40"
            >
              Older
            </button>
          </div>
        )}
      </main>
    </>
  );
}

export default function AdminLeadsPage() {
  return (
    <RequirePermission permission="lead:moderate">
      <AdminLeads />
    </RequirePermission>
  );
}
