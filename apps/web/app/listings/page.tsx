"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "../../lib/api";
import { formatMoney } from "../../lib/format";
import type { Category, Listing } from "../../lib/types";
import { useAuth } from "../../lib/auth-context";
import { Topbar } from "../../components/Topbar";
import { ShopIcon } from "../../components/icons";

function ListingsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const q = searchParams.get("q")?.toLowerCase() ?? "";

  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategoryId, setSubcategoryId] = useState("");
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Category[]>("/categories").then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const path = subcategoryId ? `/listings?subcategoryId=${subcategoryId}` : "/listings";
    api
      .get<Listing[]>(path)
      .then(setListings)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [subcategoryId]);

  const visibleListings = useMemo(
    () => (q ? listings.filter((l) => l.title.toLowerCase().includes(q) || l.description.toLowerCase().includes(q)) : listings),
    [listings, q],
  );

  return (
    <>
      <Topbar title="Marketplace" subtitle="Find the deal. Then, optionally, secure it with Escrow." />
      <main className="flex-1 bg-tm-navy/[0.02] p-6">
        <div className="rounded-xl bg-tm-navy px-6 py-10 text-tm-white sm:px-10">
          <h1 className="text-2xl font-bold sm:text-3xl">
            Find the perfect deal. <span className="text-tm-gold">Secure the transaction.</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm text-tm-white/70">Buy and sell with confidence on TrustMart Marketplace.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a href="#browse" className="tm-btn-gold">
              Browse Listings
            </a>
            {user && (
              <Link href="/listings/new" className="rounded-md border border-tm-white/30 px-4 py-2 text-sm font-semibold text-tm-white transition hover:border-tm-gold hover:text-tm-gold">
                + Post a Listing
              </Link>
            )}
          </div>
        </div>

        {categories.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setSubcategoryId("")}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                subcategoryId === "" ? "border-tm-navy bg-tm-navy text-tm-white" : "border-tm-navy/15 text-tm-dark/70 hover:border-tm-navy/40"
              }`}
            >
              <ShopIcon className="h-4 w-4" /> All categories
            </button>
            {categories.flatMap((c) => c.subcategories).map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => setSubcategoryId(sub.id)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  subcategoryId === sub.id ? "border-tm-navy bg-tm-navy text-tm-white" : "border-tm-navy/15 text-tm-dark/70 hover:border-tm-navy/40"
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>
        )}

        <div id="browse" className="mt-6 scroll-mt-6">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {loading ? (
            <p className="text-sm text-tm-dark/60">Loading…</p>
          ) : visibleListings.length === 0 ? (
            <p className="text-sm text-tm-dark/60">No listings match yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleListings.map((listing) => (
                <Link key={listing.id} href={`/listings/${listing.id}`} className="tm-card transition hover:-translate-y-0.5 hover:shadow-md">
                  {listing.subcategory && (
                    <span className="tm-badge bg-tm-navy/10 text-tm-navy">{listing.subcategory.label}</span>
                  )}
                  <h2 className="mt-2 font-semibold text-tm-navy">{listing.title}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-tm-dark/70">{listing.description}</p>
                  <p className="mt-3 text-lg font-bold text-tm-dark">
                    {formatMoney(listing.askingPriceMinorUnits, listing.currency)}
                  </p>
                  {(listing.city || listing.state) && (
                    <p className="mt-1 text-xs text-tm-dark/60">{[listing.city, listing.state].filter(Boolean).join(", ")}</p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

export default function ListingsPage() {
  return (
    <Suspense fallback={null}>
      <ListingsContent />
    </Suspense>
  );
}
