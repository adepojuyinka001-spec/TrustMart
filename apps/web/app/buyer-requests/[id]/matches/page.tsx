"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "../../../../lib/api";
import { formatMoney } from "../../../../lib/format";
import type { Match } from "../../../../lib/types";
import { useAuth } from "../../../../lib/auth-context";
import { RequireAuth } from "../../../../components/RequireAuth";
import { Topbar } from "../../../../components/Topbar";

const CLASSIFICATION_STYLE: Record<string, { text: string; bar: string }> = {
  EXCELLENT: { text: "text-emerald-700", bar: "bg-emerald-500" },
  STRONG: { text: "text-blue-700", bar: "bg-blue-500" },
  GOOD: { text: "text-amber-700", bar: "bg-amber-500" },
  ALTERNATIVE: { text: "text-gray-500", bar: "bg-gray-400" },
};

const CLASSIFICATION_LABEL: Record<string, string> = {
  EXCELLENT: "Excellent Match",
  STRONG: "Great Match",
  GOOD: "Good Match",
  ALTERNATIVE: "Alternative Match",
};

function BuyerRequestMatches() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [interestBusy, setInterestBusy] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
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
      setSentIds((prev) => new Set(prev).add(match.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send interest.");
    } finally {
      setInterestBusy(null);
    }
  }

  return (
    <>
      <Topbar title="Marketplace Matches" subtitle={`${matches.filter((m) => m.qualified).length} qualifying matches`} />
      <main className="flex-1 bg-tm-navy/[0.02] p-6">
        {matches.length > 0 && (
          <div className="tm-card mb-6 flex items-center gap-3 border-tm-gold/30 bg-tm-gold/5">
            <span className="text-lg">✨</span>
            <div>
              <p className="text-sm font-semibold text-tm-navy">We found matches that fit your needs!</p>
              <p className="text-xs text-tm-dark/60">Deterministically scored against your requirements — never AI-guessed.</p>
            </div>
          </div>
        )}

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {loading ? (
          <p className="text-sm text-tm-dark/60">Loading…</p>
        ) : matches.length === 0 ? (
          <p className="text-sm text-tm-dark/60">
            No matches yet — matching runs automatically as listings and buyer requests are activated/updated.
          </p>
        ) : (
          <div className="space-y-3">
            {matches.map((match) => {
              const style = CLASSIFICATION_STYLE[match.classification];
              return (
                <div key={match.id} className="tm-card flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <Link href={`/listings/${match.listingId}`} className="font-semibold text-tm-navy hover:text-tm-gold">
                      {match.listing?.title ?? match.listingId}
                    </Link>
                    {match.listing && (
                      <p className="text-sm text-tm-dark/70">
                        {formatMoney(match.listing.askingPriceMinorUnits, match.listing.currency)}
                        {(match.listing.city || match.listing.state) && (
                          <span className="text-tm-dark/50"> · {[match.listing.city, match.listing.state].filter(Boolean).join(", ")}</span>
                        )}
                      </p>
                    )}
                  </div>

                  <div className="w-40 shrink-0">
                    <p className={`text-sm font-bold ${style.text}`}>
                      {match.scorePercent}% <span className="font-normal">{CLASSIFICATION_LABEL[match.classification]}</span>
                    </p>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-tm-navy/10">
                      <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${Math.min(100, match.scorePercent)}%` }} />
                    </div>
                  </div>

                  {match.qualified && (
                    <button
                      type="button"
                      disabled={interestBusy === match.id || sentIds.has(match.id)}
                      onClick={() => expressInterest(match)}
                      className="tm-btn-gold shrink-0"
                    >
                      {sentIds.has(match.id) ? "Interest Sent ✓" : interestBusy === match.id ? "Sending…" : "I'm Interested"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}

export default function BuyerRequestMatchesPage() {
  return (
    <RequireAuth>
      <BuyerRequestMatches />
    </RequireAuth>
  );
}
