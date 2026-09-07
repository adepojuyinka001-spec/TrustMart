"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api";
import { formatMoney } from "../../lib/format";
import type { Category, Listing } from "../../lib/types";
import { useAuth } from "../../lib/auth-context";

export default function ListingsPage() {
  const { user } = useAuth();
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

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-tm-navy">Browse Listings</h1>
          <p className="mt-1 text-sm text-tm-dark/70">Find the deal. Then, optionally, secure it with Escrow.</p>
        </div>
        {user && (
          <Link href="/listings/new" className="tm-btn-primary">
            + Post a Listing
          </Link>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <select value={subcategoryId} onChange={(e) => setSubcategoryId(e.target.value)} className="tm-select max-w-xs">
          <option value="">All categories</option>
          {categories.map((category) => (
            <optgroup key={category.id} label={category.label}>
              {category.subcategories.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="mt-10 text-sm text-tm-dark/60">Loading…</p>
      ) : listings.length === 0 ? (
        <p className="mt-10 text-sm text-tm-dark/60">No active listings yet.</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <Link key={listing.id} href={`/listings/${listing.id}`} className="tm-card transition hover:shadow-md">
              <h2 className="font-semibold text-tm-navy">{listing.title}</h2>
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
    </main>
  );
}
