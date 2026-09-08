"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api";
import { formatMoney } from "../../lib/format";
import type { Escrow } from "../../lib/types";
import { useAuth } from "../../lib/auth-context";
import { RequireAuth } from "../../components/RequireAuth";
import { StatusBadge } from "../../components/StatusBadge";
import { Topbar } from "../../components/Topbar";

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
    <>
      <Topbar
        title="My Escrows"
        subtitle="Terms are versioned and require every party's explicit acceptance. No funding/release yet."
      />
      <main className="mx-auto max-w-4xl flex-1 p-6">
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
              <div className="flex items-center gap-4">
                {escrow.termVersions?.[0] && (
                  <p className="text-sm font-semibold text-tm-dark">
                    {formatMoney(escrow.termVersions[0].transactionAmountMinorUnits, escrow.currency)}
                  </p>
                )}
                <StatusBadge status={escrow.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
      </main>
    </>
  );
}

export default function EscrowsPage() {
  return (
    <RequireAuth>
      <Escrows />
    </RequireAuth>
  );
}
