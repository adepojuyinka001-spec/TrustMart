"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "../../../lib/api";
import { formatMoney } from "../../../lib/format";
import type { Listing } from "../../../lib/types";
import { useAuth } from "../../../lib/auth-context";
import { RequireAuth } from "../../../components/RequireAuth";
import { StatusBadge } from "../../../components/StatusBadge";

function MyListings() {
  const { token } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<Listing[]>("/listings/mine", token)
      .then(setListings)
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(load, [load]);

  async function runAction(id: string, action: "submit" | "mark-sold" | "renew") {
    setBusyId(id);
    setActionError(null);
    try {
      await api.post(`/listings/${id}/${action}`, undefined, token);
      load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-tm-navy">My Listings</h1>
        <Link href="/listings/new" className="tm-btn-primary">
          + Post a Listing
        </Link>
      </div>

      {actionError && <p className="mt-4 text-sm text-red-600">{actionError}</p>}

      {loading ? (
        <p className="mt-8 text-sm text-tm-dark/60">Loading…</p>
      ) : listings.length === 0 ? (
        <p className="mt-8 text-sm text-tm-dark/60">You haven't posted any listings yet.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {listings.map((listing) => (
            <div key={listing.id} className="tm-card flex flex-wrap items-center justify-between gap-4">
              <div>
                <Link href={`/listings/${listing.id}`} className="font-semibold text-tm-navy hover:text-tm-gold">
                  {listing.title}
                </Link>
                <p className="text-sm text-tm-dark/70">{formatMoney(listing.askingPriceMinorUnits, listing.currency)}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={listing.status} />
                <Link href={`/listings/${listing.id}/interests`} className="text-sm font-medium text-tm-navy hover:text-tm-gold">
                  Interests
                </Link>
                {listing.status === "DRAFT" && (
                  <button
                    type="button"
                    disabled={busyId === listing.id}
                    onClick={() => runAction(listing.id, "submit")}
                    className="tm-btn-outline"
                  >
                    Submit for review
                  </button>
                )}
                {(listing.status === "ACTIVE" || listing.status === "EXPIRING") && (
                  <button
                    type="button"
                    disabled={busyId === listing.id}
                    onClick={() => runAction(listing.id, "mark-sold")}
                    className="tm-btn-outline"
                  >
                    Mark sold
                  </button>
                )}
                {(listing.status === "EXPIRING" || listing.status === "EXPIRED") && (
                  <button
                    type="button"
                    disabled={busyId === listing.id}
                    onClick={() => runAction(listing.id, "renew")}
                    className="tm-btn-outline"
                  >
                    Still available (renew)
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

export default function MyListingsPage() {
  return (
    <RequireAuth>
      <MyListings />
    </RequireAuth>
  );
}
