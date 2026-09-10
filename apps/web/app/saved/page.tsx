"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "../../lib/api";
import { formatMoney } from "../../lib/format";
import type { SavedListingEntry } from "../../lib/types";
import { useAuth } from "../../lib/auth-context";
import { RequireAuth } from "../../components/RequireAuth";
import { Topbar } from "../../components/Topbar";
import { HeartIcon } from "../../components/icons";

function SavedListings() {
  const { token } = useAuth();
  const [saved, setSaved] = useState<SavedListingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<SavedListingEntry[]>("/saved-listings/mine", token)
      .then(setSaved)
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(load, [load]);

  async function unsave(listingId: string) {
    setSaved((prev) => prev.filter((s) => s.listingId !== listingId));
    try {
      await api.delete(`/listings/${listingId}/save`, token);
    } catch (err) {
      if (err instanceof ApiError) load();
    }
  }

  return (
    <>
      <Topbar title="Saved Listings" subtitle="Listings you've bookmarked to come back to" />
      <main className="flex-1 bg-tm-navy/[0.02] p-6">
        {loading ? (
          <p className="text-sm text-tm-dark/60">Loading…</p>
        ) : saved.length === 0 ? (
          <p className="text-sm text-tm-dark/60">
            Nothing saved yet — tap the heart on any listing to save it here.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {saved.map(({ listing, listingId }) => (
              <div key={listingId} className="tm-card relative transition hover:-translate-y-0.5 hover:shadow-md">
                <button
                  type="button"
                  onClick={() => unsave(listingId)}
                  aria-label="Unsave listing"
                  className="absolute right-4 top-4 text-tm-gold transition hover:opacity-70"
                >
                  <HeartIcon filled className="h-5 w-5" />
                </button>
                <Link href={`/listings/${listingId}`} className="block">
                  {listing.subcategory && (
                    <span className="tm-badge bg-tm-navy/10 text-tm-navy">{listing.subcategory.label}</span>
                  )}
                  <h2 className="mt-2 pr-6 font-semibold text-tm-navy">{listing.title}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-tm-dark/70">{listing.description}</p>
                  <p className="mt-3 text-lg font-bold text-tm-dark">
                    {formatMoney(listing.askingPriceMinorUnits, listing.currency)}
                  </p>
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

export default function SavedListingsPage() {
  return (
    <RequireAuth>
      <SavedListings />
    </RequireAuth>
  );
}
