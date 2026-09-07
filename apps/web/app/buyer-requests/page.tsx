"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "../../lib/api";
import { formatMoney } from "../../lib/format";
import type { BuyerRequest } from "../../lib/types";
import { useAuth } from "../../lib/auth-context";
import { RequireAuth } from "../../components/RequireAuth";
import { StatusBadge } from "../../components/StatusBadge";

function BuyerRequests() {
  const { token } = useAuth();
  const [requests, setRequests] = useState<BuyerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<BuyerRequest[]>("/buyer-requests/mine", token)
      .then(setRequests)
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(load, [load]);

  async function activate(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await api.post(`/buyer-requests/${id}/activate`, undefined, token);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not activate request.");
    } finally {
      setBusyId(null);
    }
  }

  async function cancel(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await api.post(`/buyer-requests/${id}/cancel`, undefined, token);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not cancel request.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-tm-navy">My Buyer Requests</h1>
          <p className="mt-1 text-sm text-tm-dark/70">
            A request must be ACTIVE before it's eligible for matching — review it, then activate.
          </p>
        </div>
        <Link href="/buyer-requests/new" className="tm-btn-primary">
          + New Request
        </Link>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="mt-8 text-sm text-tm-dark/60">Loading…</p>
      ) : requests.length === 0 ? (
        <p className="mt-8 text-sm text-tm-dark/60">You haven't created any buyer requests yet.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {requests.map((req) => (
            <div key={req.id} className="tm-card flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-tm-navy">
                  {req.subcategory ? `${req.subcategory.category?.label} → ${req.subcategory.label}` : req.subcategoryId}
                </p>
                <p className="text-sm text-tm-dark/70">
                  Budget: {formatMoney(req.minBudgetMinorUnits, req.currency)} – {formatMoney(req.maxBudgetMinorUnits, req.currency)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={req.status} />
                {req.status === "ACTIVE" && (
                  <Link href={`/buyer-requests/${req.id}/matches`} className="text-sm font-medium text-tm-navy hover:text-tm-gold">
                    View matches
                  </Link>
                )}
                {req.status === "DRAFT" && (
                  <button type="button" disabled={busyId === req.id} onClick={() => activate(req.id)} className="tm-btn-outline">
                    Activate
                  </button>
                )}
                {(req.status === "DRAFT" || req.status === "ACTIVE" || req.status === "PAUSED") && (
                  <button type="button" disabled={busyId === req.id} onClick={() => cancel(req.id)} className="tm-btn-outline">
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

export default function BuyerRequestsPage() {
  return (
    <RequireAuth>
      <BuyerRequests />
    </RequireAuth>
  );
}
