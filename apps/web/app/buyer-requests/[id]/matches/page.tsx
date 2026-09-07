"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "../../../../lib/api";
import { formatMoney } from "../../../../lib/format";
import type { Match } from "../../../../lib/types";
import { useAuth } from "../../../../lib/auth-context";
import { RequireAuth } from "../../../../components/RequireAuth";

const CLASSIFICATION_COLOR: Record<string, string> = {
  EXCELLENT: "bg-emerald-100 text-emerald-800",
  STRONG: "bg-blue-100 text-blue-800",
  GOOD: "bg-amber-100 text-amber-800",
  ALTERNATIVE: "bg-gray-100 text-gray-600",
};

function BuyerRequestMatches() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [interestBusy, setInterestBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Match[]>(`/buyer-requests/${id}/matches`, token)
      .then(setMatches)
      .finally(() => setLoading(false));
  }, [id, token]);

  async function expressInterest(match: Match) {
    setInterestBusy(match.id);
    setError(null);
    try {
      await api.post("/interests", { listingId: match.listingId, matchId: match.id }, token);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send interest.");
    } finally {
      setInterestBusy(null);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-bold text-tm-navy">Matches</h1>
      <p className="mt-1 text-sm text-tm-dark/70">
        Deterministically scored against your requirements. Alternative matches fall below the qualifying threshold.
      </p>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="mt-8 text-sm text-tm-dark/60">Loading…</p>
      ) : matches.length === 0 ? (
        <p className="mt-8 text-sm text-tm-dark/60">
          No matches yet — matching runs automatically as listings and buyer requests are activated/updated.
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          {matches.map((match) => (
            <div key={match.id} className="tm-card flex flex-wrap items-center justify-between gap-4">
              <div>
                <Link href={`/listings/${match.listingId}`} className="font-semibold text-tm-navy hover:text-tm-gold">
                  {match.listing?.title ?? match.listingId}
                </Link>
                {match.listing && (
                  <p className="text-sm text-tm-dark/70">
                    {formatMoney(match.listing.askingPriceMinorUnits, match.listing.currency)}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className={`tm-badge ${CLASSIFICATION_COLOR[match.classification]}`}>
                  {match.classification} · {match.scorePercent}%
                </span>
                {match.qualified && (
                  <button
                    type="button"
                    disabled={interestBusy === match.id}
                    onClick={() => expressInterest(match)}
                    className="tm-btn-gold"
                  >
                    {interestBusy === match.id ? "Sending…" : "I'm Interested"}
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

export default function BuyerRequestMatchesPage() {
  return (
    <RequireAuth>
      <BuyerRequestMatches />
    </RequireAuth>
  );
}
