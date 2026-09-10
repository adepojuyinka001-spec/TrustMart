"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { api, ApiError } from "../../../lib/api";
import { formatMoney } from "../../../lib/format";
import type { Listing } from "../../../lib/types";
import { useAuth } from "../../../lib/auth-context";
import { RequirePermission } from "../../../components/RequirePermission";
import { Topbar } from "../../../components/Topbar";
import { StatusBadge } from "../../../components/StatusBadge";

function RejectForm({ onReject, onCancel }: { onReject: (reason: string) => void; onCancel: () => void }) {
  const [reason, setReason] = useState("");
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <input
        autoFocus
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason for rejection…"
        className="tm-input max-w-xs text-sm"
      />
      <button
        type="button"
        disabled={!reason.trim()}
        onClick={() => onReject(reason.trim())}
        className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
      >
        Confirm Reject
      </button>
      <button type="button" onClick={onCancel} className="tm-btn-outline px-3 py-1.5 text-xs">
        Cancel
      </button>
    </div>
  );
}

function ListingCard({ listing, onDecided }: { listing: Listing; onDecided: () => void }) {
  const { token } = useAuth();
  const [rejecting, setRejecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function approve() {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/listings/${listing.id}/approve`, undefined, token);
      onDecided();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not approve listing.");
    } finally {
      setBusy(false);
    }
  }

  async function reject(reason: string) {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/listings/${listing.id}/reject`, { reason }, token);
      onDecided();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reject listing.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tm-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-tm-navy">{listing.title}</h2>
            <StatusBadge status={listing.status} />
          </div>
          <p className="mt-0.5 text-xs text-tm-dark/50">
            {listing.subcategory?.category?.label ?? "—"} → {listing.subcategory?.label ?? "—"} · Seller #
            {listing.sellerUserId.slice(-8)}
            {listing.createdAt && ` · Submitted ${new Date(listing.createdAt).toLocaleDateString()}`}
          </p>
        </div>
        <p className="text-sm font-bold text-tm-navy">{formatMoney(listing.askingPriceMinorUnits, listing.currency)}</p>
      </div>

      {listing.media && listing.media.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {listing.media.map((photo) => (
            <div key={photo.id} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-tm-navy/10">
              <Image src={photo.url} alt={listing.title} fill className="object-cover" unoptimized />
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-sm text-tm-dark/70">{listing.description}</p>

      {listing.attributeValues && listing.attributeValues.length > 0 && (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-tm-dark/60 sm:grid-cols-3">
          {listing.attributeValues.map((av) => (
            <div key={av.attributeId}>
              <dt className="inline font-medium text-tm-dark/80">{av.attribute?.label ?? av.attributeId}: </dt>
              <dd className="inline">{av.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {rejecting ? (
        <RejectForm onReject={reject} onCancel={() => setRejecting(false)} />
      ) : (
        <div className="mt-4 flex gap-2">
          <button type="button" disabled={busy} onClick={approve} className="tm-btn-primary">
            {busy ? "Working…" : "Approve"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setRejecting(true)}
            className="rounded-md border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-40"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}

function AdminListings() {
  const { token } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  function reload() {
    setLoading(true);
    api
      .get<Listing[]>("/listings/moderation-queue", token)
      .then(setListings)
      .finally(() => setLoading(false));
  }

  useEffect(reload, [token]);

  return (
    <>
      <Topbar title="Admin — Listing Moderation" subtitle="Listings awaiting SUBMITTED/CHECKING review before going ACTIVE" />
      <main className="flex-1 space-y-4 bg-tm-navy/[0.02] p-6">
        {loading ? (
          <p className="text-sm text-tm-dark/60">Loading…</p>
        ) : listings.length === 0 ? (
          <p className="text-sm text-tm-dark/60">Nothing awaiting moderation.</p>
        ) : (
          listings.map((listing) => <ListingCard key={listing.id} listing={listing} onDecided={reload} />)
        )}
      </main>
    </>
  );
}

export default function AdminListingsPage() {
  return (
    <RequirePermission permission="listing:moderate">
      <AdminListings />
    </RequirePermission>
  );
}
