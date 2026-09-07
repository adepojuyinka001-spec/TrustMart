"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "../../../../lib/api";
import type { Interest } from "../../../../lib/types";
import { useAuth } from "../../../../lib/auth-context";
import { RequireAuth } from "../../../../components/RequireAuth";
import { StatusBadge } from "../../../../components/StatusBadge";

function ListingInterests() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [interests, setInterests] = useState<Interest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Interest[]>(`/listings/${id}/interests`, token)
      .then(setInterests)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, token]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-bold text-tm-navy">Interested Buyers</h1>
      <p className="mt-1 text-sm text-tm-dark/70">
        Buyer identity and message are visible here; budgets/requirements stay private to the buyer.
      </p>

      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="mt-8 text-sm text-tm-dark/60">Loading…</p>
      ) : interests.length === 0 ? (
        <p className="mt-8 text-sm text-tm-dark/60">No interest yet on this listing.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {interests.map((interest) => (
            <div key={interest.id} className="tm-card">
              <div className="flex items-center justify-between">
                <p className="text-sm text-tm-dark/60">{new Date(interest.createdAt).toLocaleString()}</p>
                {interest.lead && <StatusBadge status={interest.lead.status} />}
              </div>
              {interest.message && <p className="mt-2 text-tm-dark/85">"{interest.message}"</p>}
              {interest.lead && (
                <Link
                  href={`/leads/${interest.lead.id}`}
                  className="mt-3 inline-block text-sm font-semibold text-tm-navy hover:text-tm-gold"
                >
                  Manage this lead →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

export default function ListingInterestsPage() {
  return (
    <RequireAuth>
      <ListingInterests />
    </RequireAuth>
  );
}
