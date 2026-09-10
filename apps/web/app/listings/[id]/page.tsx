"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { api, ApiError } from "../../../lib/api";
import { formatMoney } from "../../../lib/format";
import type { Listing, SavedListingEntry } from "../../../lib/types";
import { useAuth } from "../../../lib/auth-context";
import { StatusBadge } from "../../../components/StatusBadge";
import { Topbar } from "../../../components/Topbar";
import { HeartIcon } from "../../../components/icons";
import { PhotoManager } from "../../../components/PhotoManager";

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, token } = useAuth();

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [interestState, setInterestState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [interestError, setInterestError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);

  const load = useCallback(() => {
    api
      .get<Listing>(`/listings/${id}`)
      .then(setListing)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(load, [load]);

  useEffect(() => {
    if (!token) return;
    api
      .get<SavedListingEntry[]>("/saved-listings/mine", token)
      .then((saved) => setSaved(saved.some((s) => s.listingId === id)))
      .catch(() => {});
  }, [id, token]);

  async function toggleSave() {
    if (!token) {
      router.push("/login");
      return;
    }
    setSaveBusy(true);
    try {
      if (saved) {
        await api.delete(`/listings/${id}/save`, token);
        setSaved(false);
      } else {
        await api.post(`/listings/${id}/save`, undefined, token);
        setSaved(true);
      }
    } catch {
      // Non-critical UI action — silently leave state unchanged on failure.
    } finally {
      setSaveBusy(false);
    }
  }

  async function expressInterest() {
    if (!token) {
      router.push("/login");
      return;
    }
    setInterestState("sending");
    setInterestError(null);
    try {
      await api.post(`/interests`, { listingId: id, message: message || undefined }, token);
      setInterestState("sent");
    } catch (err) {
      setInterestState("error");
      setInterestError(err instanceof ApiError ? err.message : "Could not send interest.");
    }
  }

  if (loading)
    return (
      <>
        <Topbar title="Listing" />
        <main className="flex-1 p-6 text-sm text-tm-dark/60">Loading…</main>
      </>
    );
  if (!listing)
    return (
      <>
        <Topbar title="Listing" />
        <main className="flex-1 p-6 text-sm text-red-600">Listing not found.</main>
      </>
    );

  const isOwner = user?.id === listing.sellerUserId;

  return (
    <>
      <Topbar title={listing.title} subtitle={listing.subcategory ? `${listing.subcategory.category?.label} → ${listing.subcategory.label}` : undefined} />
      <main className="mx-auto max-w-3xl flex-1 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-tm-navy">{listing.title}</h1>
          {listing.subcategory && (
            <p className="mt-1 text-sm text-tm-dark/60">
              {listing.subcategory.category?.label} → {listing.subcategory.label}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={listing.status} />
          {!isOwner && (
            <button
              type="button"
              onClick={toggleSave}
              disabled={saveBusy}
              aria-label={saved ? "Unsave listing" : "Save listing"}
              className="text-tm-gold transition hover:opacity-70 disabled:opacity-40"
            >
              <HeartIcon filled={saved} className="h-6 w-6" />
            </button>
          )}
        </div>
      </div>

      {listing.media && listing.media.length > 0 && (
        <div className="mt-4">
          <div className="relative aspect-video overflow-hidden rounded-lg border border-tm-navy/10 bg-tm-navy/5">
            <Image src={listing.media[0].url} alt={listing.title} fill className="object-cover" unoptimized priority />
          </div>
          {listing.media.length > 1 && (
            <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6">
              {listing.media.slice(1).map((photo) => (
                <div key={photo.id} className="relative aspect-square overflow-hidden rounded-md border border-tm-navy/10">
                  <Image src={photo.url} alt={listing.title} fill className="object-cover" unoptimized />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="mt-4 text-2xl font-bold text-tm-dark">
        {formatMoney(listing.askingPriceMinorUnits, listing.currency)}
        {listing.negotiable && <span className="ml-2 text-sm font-normal text-tm-dark/60">(negotiable)</span>}
      </p>

      {(listing.city || listing.state || listing.country) && (
        <p className="mt-1 text-sm text-tm-dark/60">
          {[listing.city, listing.state, listing.country].filter(Boolean).join(", ")}
        </p>
      )}

      <p className="mt-6 whitespace-pre-wrap text-tm-dark/85">{listing.description}</p>

      {listing.attributeValues && listing.attributeValues.length > 0 && (
        <dl className="mt-6 grid grid-cols-2 gap-3 border-t border-tm-navy/10 pt-6 sm:grid-cols-3">
          {listing.attributeValues.map((av) => (
            <div key={av.attributeId}>
              <dt className="text-xs uppercase tracking-wide text-tm-dark/50">{av.attribute?.label ?? av.attributeId}</dt>
              <dd className="text-sm font-medium text-tm-dark">{av.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {!isOwner && listing.status === "ACTIVE" && (
        <div className="mt-8 rounded-lg border border-tm-gold/40 bg-tm-gold/5 p-5">
          {interestState === "sent" ? (
            <p className="font-medium text-tm-navy">
              Interest sent! The seller can now see your interest and follow up.
            </p>
          ) : (
            <>
              <h2 className="font-semibold text-tm-navy">Interested in this listing?</h2>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Optional message to the seller"
                className="tm-input mt-3"
                rows={2}
              />
              {interestError && <p className="mt-2 text-sm text-red-600">{interestError}</p>}
              <button
                type="button"
                onClick={expressInterest}
                disabled={interestState === "sending"}
                className="tm-btn-gold mt-3"
              >
                {interestState === "sending" ? "Sending…" : "I'm Interested"}
              </button>
            </>
          )}
        </div>
      )}

      {isOwner && (
        <>
          <div className="mt-8">
            <PhotoManager listingId={listing.id} photos={listing.media ?? []} onChanged={load} />
          </div>
          <p className="mt-4 rounded-lg border border-tm-navy/10 bg-tm-navy/5 p-4 text-sm text-tm-dark/70">
            This is your listing. Manage its details from{" "}
            <a href="/listings/mine" className="font-semibold text-tm-navy hover:text-tm-gold">
              My Listings
            </a>
            .
          </p>
        </>
      )}
      </main>
    </>
  );
}
