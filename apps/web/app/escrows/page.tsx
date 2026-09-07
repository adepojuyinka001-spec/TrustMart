"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api";
import type { Escrow } from "../../lib/types";
import { useAuth } from "../../lib/auth-context";
import { RequireAuth } from "../../components/RequireAuth";
import { StatusBadge } from "../../components/StatusBadge";

function Escrows() {
  const { token } = useAuth();
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Escrow[]>("/escrows/mine", token)
      .then(setEscrows)
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-bold text-tm-navy">My Escrows</h1>
      <p className="mt-1 text-sm text-tm-dark/70">
        Terms are versioned and require every party's explicit acceptance. No funding/release yet — that's still pending
        a payment provider decision.
      </p>

      {loading ? (
        <p className="mt-8 text-sm text-tm-dark/60">Loading…</p>
      ) : escrows.length === 0 ? (
        <p className="mt-8 text-sm text-tm-dark/60">No Escrow transactions yet.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {escrows.map((escrow) => (
            <Link
              key={escrow.id}
              href={`/escrows/${escrow.id}`}
              className="tm-card flex items-center justify-between transition hover:shadow-md"
            >
              <div>
                <p className="font-semibold text-tm-navy">{escrow.title}</p>
                <p className="text-xs text-tm-dark/60">{escrow.originType} · created {new Date(escrow.createdAt).toLocaleDateString()}</p>
              </div>
              <StatusBadge status={escrow.status} />
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

export default function EscrowsPage() {
  return (
    <RequireAuth>
      <Escrows />
    </RequireAuth>
  );
}
