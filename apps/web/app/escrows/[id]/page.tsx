"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, ApiError } from "../../../lib/api";
import { formatMoney } from "../../../lib/format";
import type { Escrow } from "../../../lib/types";
import { useAuth } from "../../../lib/auth-context";
import { RequireAuth } from "../../../components/RequireAuth";
import { StatusBadge } from "../../../components/StatusBadge";
import { Topbar } from "../../../components/Topbar";

const STEPS = ["Created", "Terms Accepted", "Funding", "Completed"] as const;

function currentStepIndex(status: Escrow["status"]): number {
  switch (status) {
    case "DRAFT":
    case "TERMS_PROPOSED":
      return 1;
    case "ACCEPTED":
      return 2;
    case "CANCELLED":
      return -1;
    default:
      return 0;
  }
}

function StepTracker({ status }: { status: Escrow["status"] }) {
  if (status === "CANCELLED") {
    return (
      <div className="tm-card mb-6 border-red-200 bg-red-50 text-sm font-medium text-red-700">
        This escrow was cancelled — the step tracker no longer applies.
      </div>
    );
  }
  const current = currentStepIndex(status);
  return (
    <div className="tm-card mb-6">
      <div className="flex items-center">
        {STEPS.map((step, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <div key={step} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold ${
                    done
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : active
                        ? "border-tm-navy bg-tm-navy text-white"
                        : "border-tm-navy/20 bg-white text-tm-dark/30"
                  }`}
                >
                  {done ? "✓" : i + 1}
                </div>
                <span className={`text-center text-[11px] font-medium ${active ? "text-tm-navy" : "text-tm-dark/50"}`}>{step}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`mx-2 h-0.5 flex-1 ${done ? "bg-emerald-500" : "bg-tm-navy/15"}`} />}
            </div>
          );
        })}
      </div>
      {current === 2 && (
        <p className="mt-4 rounded-md bg-tm-gold/10 px-3 py-2 text-xs text-tm-dark/70">
          Terms are accepted — funding isn't available yet on TrustMart (pending a payment-provider decision).
        </p>
      )}
    </div>
  );
}

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

  if (loading)
    return (
      <>
        <Topbar title="Escrow Details" />
        <main className="flex-1 p-6 text-sm text-tm-dark/60">Loading…</main>
      </>
    );
  if (!escrow)
    return (
      <>
        <Topbar title="Escrow Details" />
        <main className="flex-1 p-6 text-sm text-red-600">Escrow not found.</main>
      </>
    );

  const latestTerms = escrow.termVersions[0];
  const myParty = escrow.parties.find((p) => p.userId === user?.id);
  const hasAccepted = latestTerms?.acceptances.some((a) => a.userId === user?.id);
  const canRespond = escrow.status === "TERMS_PROPOSED" && myParty?.status !== "DECLINED";

  return (
    <>
      <Topbar title="Escrow Details" subtitle={`ID: ${escrow.id}`} />
      <main className="mx-auto max-w-2xl flex-1 bg-tm-navy/[0.02] p-6">
        <div className="mb-1 flex items-center justify-between">
          <h1 className="text-xl font-bold text-tm-navy">{escrow.title}</h1>
          <StatusBadge status={escrow.status} />
        </div>
        {escrow.description && <p className="mb-6 text-sm text-tm-dark/70">{escrow.description}</p>}

        <StepTracker status={escrow.status} />

      {latestTerms && (
        <div className="tm-card">
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
    </>
  );
}

export default function EscrowDetailPage() {
  return (
    <RequireAuth>
      <EscrowDetail />
    </RequireAuth>
  );
}
