"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { api, ApiError } from "../../../lib/api";
import { formatMoney } from "../../../lib/format";
import type { Listing } from "../../../lib/types";
import { useAuth } from "../../../lib/auth-context";
import { RequireAuth } from "../../../components/RequireAuth";
import { StatusBadge } from "../../../components/StatusBadge";
import { Topbar } from "../../../components/Topbar";
import { TagIcon } from "../../../components/icons";

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
    <>
      <Topbar title="My Listings" />
      <main className="mx-auto max-w-5xl flex-1 p-6">
      <div className="flex items-center justify-end">
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
              <div className="flex items-center gap-3">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-tm-navy/5">
                  {listing.media && listing.media.length > 0 ? (
                    <Image src={listing.media[0].url} alt={listing.title} fill className="object-cover" unoptimized />
                  ) : (
                    <div className="flex h-full items-center justify-center text-tm-navy/20">
                      <TagIcon className="h-5 w-5" />
                    </div>
                  )}
                </div>
                <div>
                  <Link href={`/listings/${listing.id}`} className="font-semibold text-tm-navy hover:text-tm-gold">
                    {listing.title}
                  </Link>
                  <p className="text-sm text-tm-dark/70">{formatMoney(listing.askingPriceMinorUnits, listing.currency)}</p>
                </div>
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
    </>
  );
}

export default function MyListingsPage() {
  return (
    <RequireAuth>
      <MyListings />
    </RequireAuth>
  );
}
