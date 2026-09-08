"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "../../../../lib/api";
import type { Lead } from "../../../../lib/types";
import { useAuth } from "../../../../lib/auth-context";
import { RequirePermission } from "../../../../components/RequirePermission";
import { Topbar } from "../../../../components/Topbar";
import { StatusBadge } from "../../../../components/StatusBadge";

function SpamFraudForm({ leadId, onDone }: { leadId: string; onDone: () => void }) {
  const { token } = useAuth();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post(`/leads/${leadId}/moderate/spam-fraud`, { reason }, token);
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not mark as spam/fraud.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-3">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-tm-dark/60">Reason (required, recorded on the audit log)</span>
        <input required value={reason} onChange={(e) => setReason(e.target.value)} className="tm-input" />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting || !reason.trim()}
        className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
      >
        {submitting ? "Working…" : "Mark as Spam/Fraud"}
      </button>
    </form>
  );
}

function AdminLeadDetail() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<Lead>(`/admin/leads/${id}`, token)
      .then(setLead)
      .finally(() => setLoading(false));
  }, [id, token]);

  useEffect(load, [load]);

  if (loading || !lead) {
    return (
      <>
        <Topbar title="Admin — Lead" />
        <main className="flex-1 p-6 text-sm text-tm-dark/60">Loading…</main>
      </>
    );
  }

  const isTerminal = ["WON", "LOST", "SPAM_FRAUD"].includes(lead.status);

  return (
    <>
      <Topbar title={lead.interest?.listing?.title ?? `Lead #${lead.id.slice(-8)}`} />
      <main className="mx-auto max-w-2xl flex-1 space-y-6 p-6">
        <Link href="/admin/leads" className="text-sm font-medium text-tm-navy hover:text-tm-gold">
          ← Back to leads
        </Link>

        <div className="tm-card">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-tm-navy">Overview</h2>
            <StatusBadge status={lead.status} />
          </div>
          <dl className="mt-3 space-y-1 text-sm text-tm-dark/70">
            <div>
              <dt className="inline font-medium text-tm-dark/80">Buyer: </dt>
              <dd className="inline">#{lead.buyerUserId.slice(-8)}</dd>
            </div>
            <div>
              <dt className="inline font-medium text-tm-dark/80">Seller: </dt>
              <dd className="inline">#{lead.sellerUserId.slice(-8)}</dd>
            </div>
            <div>
              <dt className="inline font-medium text-tm-dark/80">Created: </dt>
              <dd className="inline">{new Date(lead.createdAt).toLocaleString()}</dd>
            </div>
          </dl>
        </div>

        {lead.activities && lead.activities.length > 0 && (
          <div className="tm-card">
            <h2 className="font-semibold text-tm-navy">Activity</h2>
            <ul className="mt-3 space-y-2">
              {lead.activities.map((a) => (
                <li key={a.id} className="text-sm text-tm-dark/70">
                  <span className="font-medium text-tm-dark">{a.toStatus.replace(/_/g, " ")}</span> —{" "}
                  {new Date(a.createdAt).toLocaleString()} {a.note && `— "${a.note}"`}
                </li>
              ))}
            </ul>
          </div>
        )}

        {!isTerminal && (
          <div className="tm-card border-red-200">
            <h2 className="font-semibold text-red-700">Moderation</h2>
            <p className="mt-1 text-xs text-tm-dark/60">
              Terminal action — the lead cannot transition further afterward. Every attempt is audit-logged.
            </p>
            <SpamFraudForm leadId={lead.id} onDone={load} />
          </div>
        )}
      </main>
    </>
  );
}

export default function AdminLeadDetailPage() {
  return (
    <RequirePermission permission="lead:moderate">
      <AdminLeadDetail />
    </RequirePermission>
  );
}
