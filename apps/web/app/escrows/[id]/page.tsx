"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, ApiError } from "../../../lib/api";
import { formatMoney } from "../../../lib/format";
import type { Escrow } from "../../../lib/types";
import { useAuth } from "../../../lib/auth-context";
import { RequireAuth } from "../../../components/RequireAuth";
import { StatusBadge } from "../../../components/StatusBadge";

function EscrowDetail() {
  const { id } = useParams<{ id: string }>();
  const { token, user } = useAuth();

  const [escrow, setEscrow] = useState<Escrow | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<Escrow>(`/escrows/${id}`, token)
      .then(setEscrow)
      .finally(() => setLoading(false));
  }, [id, token]);

  useEffect(load, [load]);

  async function accept() {
    setBusy(true);
    setActionError(null);
    try {
      await api.post(`/escrows/${id}/accept`, undefined, token);
      load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not accept terms.");
    } finally {
      setBusy(false);
    }
  }

  async function decline() {
    setBusy(true);
    setActionError(null);
    try {
      await api.post(`/escrows/${id}/decline`, undefined, token);
      load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not decline.");
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (!cancelReason.trim()) {
      setActionError("Please provide a reason to cancel.");
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      await api.post(`/escrows/${id}/cancel`, { reason: cancelReason }, token);
      load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not cancel.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <main className="mx-auto max-w-2xl px-6 py-10 text-sm text-tm-dark/60">Loading…</main>;
  if (!escrow) return <main className="mx-auto max-w-2xl px-6 py-10 text-sm text-red-600">Escrow not found.</main>;

  const latestTerms = escrow.termVersions[0];
  const myParty = escrow.parties.find((p) => p.userId === user?.id);
  const hasAccepted = latestTerms?.acceptances.some((a) => a.userId === user?.id);
  const canRespond = escrow.status === "TERMS_PROPOSED" && myParty?.status !== "DECLINED";

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-tm-navy">{escrow.title}</h1>
        <StatusBadge status={escrow.status} />
      </div>
      {escrow.description && <p className="mt-2 text-sm text-tm-dark/70">{escrow.description}</p>}

      {latestTerms && (
        <div className="tm-card mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-tm-navy">Terms (v{latestTerms.version})</h2>
            <p className="text-xs text-tm-dark/60">Fee: {latestTerms.feePercent}%</p>
          </div>
          <p className="mt-3 text-2xl font-bold text-tm-dark">
            {formatMoney(latestTerms.transactionAmountMinorUnits, escrow.currency)}
          </p>
          <p className="mt-1 text-sm text-tm-dark/70">
            Fee allocation: {latestTerms.feeAllocation.replace(/_/g, " ")}
            {latestTerms.feeAllocation === "SHARED" && ` (buyer pays ${latestTerms.buyerFeeSharePercent}%)`}
          </p>

          {latestTerms.conditions.length > 0 && (
            <ul className="mt-3 list-inside list-disc text-sm text-tm-dark/80">
              {latestTerms.conditions.map((c) => (
                <li key={c.id}>{c.description}</li>
              ))}
            </ul>
          )}

          <div className="mt-4 border-t border-tm-navy/10 pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-tm-dark/50">Parties</p>
            <ul className="mt-2 space-y-1">
              {escrow.parties.map((p) => (
                <li key={p.id} className="text-sm text-tm-dark/80">
                  {p.role} — {p.status}
                  {latestTerms.acceptances.some((a) => a.userId === p.userId) && " ✓ accepted current terms"}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {actionError && <p className="mt-4 text-sm text-red-600">{actionError}</p>}

      {canRespond && !hasAccepted && (
        <div className="mt-6 flex gap-3">
          <button type="button" disabled={busy} onClick={accept} className="tm-btn-gold">
            Accept Terms
          </button>
          <button type="button" disabled={busy} onClick={decline} className="tm-btn-outline">
            Decline
          </button>
        </div>
      )}
      {canRespond && hasAccepted && (
        <p className="mt-6 text-sm text-tm-dark/70">
          You've accepted the current terms. Waiting on the other part{escrow.parties.length > 2 ? "ies" : "y"}.
        </p>
      )}

      {escrow.status !== "CANCELLED" && (
        <div className="mt-8 border-t border-tm-navy/10 pt-6">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-tm-dark/80">Cancel this escrow</span>
            <div className="flex gap-2">
              <input
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason"
                className="tm-input"
              />
              <button type="button" disabled={busy} onClick={cancel} className="tm-btn-outline whitespace-nowrap">
                Cancel
              </button>
            </div>
          </label>
        </div>
      )}
    </main>
  );
}

export default function EscrowDetailPage() {
  return (
    <RequireAuth>
      <EscrowDetail />
    </RequireAuth>
  );
}
