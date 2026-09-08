"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../../lib/api";
import type { VerificationCase } from "../../../lib/types";
import { useAuth } from "../../../lib/auth-context";
import { RequirePermission } from "../../../components/RequirePermission";
import { Topbar } from "../../../components/Topbar";
import { StatusBadge } from "../../../components/StatusBadge";

const STATUS_FILTERS = ["", "PENDING", "IN_REVIEW", "APPROVED", "REJECTED", "MORE_INFO_REQUIRED"];
const PAGE_SIZE = 25;

function AdminVerification() {
  const { token } = useAuth();
  const [cases, setCases] = useState<VerificationCase[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("");
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ take: String(PAGE_SIZE), skip: String(skip) });
    if (status) params.set("status", status);
    api
      .get<{ items: VerificationCase[]; total: number }>(`/admin/verification-cases?${params.toString()}`, token)
      .then((res) => {
        setCases(res.items);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }, [token, status, skip]);

  return (
    <>
      <Topbar
        title="Admin — Verification"
        subtitle="Provider-agnostic shell — manual review only, no live KYC/KYB provider yet"
      />
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
        ) : cases.length === 0 ? (
          <p className="text-sm text-tm-dark/60">No cases match this filter.</p>
        ) : (
          <div className="space-y-2">
            {cases.map((c) => (
              <Link
                key={c.id}
                href={`/admin/verification/${c.id}`}
                className="tm-card flex items-center justify-between transition hover:bg-tm-navy/[0.03]"
              >
                <div>
                  <p className="text-sm font-semibold text-tm-dark">
                    {c.subjectType === "USER" ? c.user?.email ?? "Unknown user" : c.business?.name ?? "Unknown business"}
                  </p>
                  <p className="mt-0.5 text-xs text-tm-dark/50">
                    {c.subjectType} · {new Date(c.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <StatusBadge status={c.status} />
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

export default function AdminVerificationPage() {
  return (
    <RequirePermission permission="verification:review">
      <AdminVerification />
    </RequirePermission>
  );
}
