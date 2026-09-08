"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, ApiError } from "../../../lib/api";
import type { Lead } from "../../../lib/types";
import { useAuth } from "../../../lib/auth-context";
import { RequireAuth } from "../../../components/RequireAuth";
import { StatusBadge } from "../../../components/StatusBadge";
import { Topbar } from "../../../components/Topbar";

const SELLER_STATUSES = ["VIEWED", "CONTACTED", "INSPECTION_SCHEDULED", "NEGOTIATING", "TRANSACTION_STARTED", "WON", "LOST"];

function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const { token, user } = useAuth();
  const router = useRouter();

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [contactResult, setContactResult] = useState<string | null>(null);
  const [contactBusy, setContactBusy] = useState(false);
  const [handoffError, setHandoffError] = useState<string | null>(null);
  const [handoffBusy, setHandoffBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<Lead>(`/leads/${id}`, token)
      .then(setLead)
      .finally(() => setLoading(false));
  }, [id, token]);

  useEffect(load, [load]);

  const isSeller = user?.id === lead?.sellerUserId;

  async function updateStatus(status: string) {
    setStatusBusy(true);
    setStatusError(null);
    try {
      await api.patch(`/leads/${id}/status`, { status }, token);
      load();
    } catch (err) {
      setStatusError(err instanceof ApiError ? err.message : "Could not update status.");
    } finally {
      setStatusBusy(false);
    }
  }

  async function requestContactAccess() {
    setContactBusy(true);
    setContactResult(null);
    try {
      await api.post(`/leads/${id}/contact-access`, {}, token);
      setContactResult("Access granted.");
    } catch (err) {
      setContactResult(
        err instanceof ApiError
          ? `Access denied: ${err.message.replace("Contact access denied: ", "")}`
          : "Could not request contact access.",
      );
    } finally {
      setContactBusy(false);
    }
  }

  async function secureWithEscrow() {
    setHandoffBusy(true);
    setHandoffError(null);
    try {
      const escrow = await api.post<{ id: string }>(
        `/escrows/from-lead/${id}`,
        { feeAllocation: "BUYER_PAYS" },
        token,
      );
      router.push(`/escrows/${escrow.id}`);
    } catch (err) {
      setHandoffError(err instanceof ApiError ? err.message : "Could not start Escrow.");
    } finally {
      setHandoffBusy(false);
    }
  }

  if (loading)
    return (
      <>
        <Topbar title="Lead" />
        <main className="flex-1 p-6 text-sm text-tm-dark/60">Loading…</main>
      </>
    );
  if (!lead)
    return (
      <>
        <Topbar title="Lead" />
        <main className="flex-1 p-6 text-sm text-red-600">Lead not found.</main>
      </>
    );

  const isTerminal = ["WON", "LOST", "SPAM_FRAUD"].includes(lead.status);

  return (
    <>
      <Topbar title={`Lead #${lead.id.slice(-8)}`} />
      <main className="mx-auto max-w-2xl flex-1 p-6">
      <div className="flex items-center justify-end">
        <StatusBadge status={lead.status} />
      </div>

      {isSeller && !isTerminal && (
        <div className="tm-card mt-6">
          <h2 className="text-sm font-semibold text-tm-navy">Update status</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {SELLER_STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                disabled={statusBusy || status === lead.status}
                onClick={() => updateStatus(status)}
                className="tm-btn-outline disabled:opacity-30"
              >
                {status.replace(/_/g, " ")}
              </button>
            ))}
          </div>
          {statusError && <p className="mt-3 text-sm text-red-600">{statusError}</p>}
        </div>
      )}

      {isSeller && (
        <div className="tm-card mt-4">
          <h2 className="text-sm font-semibold text-tm-navy">Request buyer contact</h2>
          <p className="mt-1 text-xs text-tm-dark/60">
            Requires an active subscription entitlement + buyer consent — every attempt is logged.
          </p>
          <button type="button" disabled={contactBusy} onClick={requestContactAccess} className="tm-btn-outline mt-3">
            {contactBusy ? "Requesting…" : "Request contact access"}
          </button>
          {contactResult && <p className="mt-3 text-sm text-tm-dark/80">{contactResult}</p>}
        </div>
      )}

      {!isTerminal && (
        <div className="mt-6 rounded-lg border border-tm-gold/40 bg-tm-gold/5 p-5">
          <h2 className="font-semibold text-tm-navy">Ready to move forward?</h2>
          <p className="mt-1 text-sm text-tm-dark/70">
            This only creates a proposal — the other party must still explicitly accept the terms.
          </p>
          {handoffError && <p className="mt-2 text-sm text-red-600">{handoffError}</p>}
          <button type="button" disabled={handoffBusy} onClick={secureWithEscrow} className="tm-btn-gold mt-3">
            {handoffBusy ? "Starting…" : "Secure This Deal With TrustMart Escrow"}
          </button>
        </div>
      )}

      {lead.activities && lead.activities.length > 0 && (
        <div className="mt-8 border-t border-tm-navy/10 pt-6">
          <h2 className="text-sm font-semibold text-tm-navy">Activity</h2>
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
      </main>
    </>
  );
}

export default function LeadDetailPage() {
  return (
    <RequireAuth>
      <LeadDetail />
    </RequireAuth>
  );
}
