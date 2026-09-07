"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api";
import type { Lead } from "../../lib/types";
import { useAuth } from "../../lib/auth-context";
import { RequireAuth } from "../../components/RequireAuth";
import { StatusBadge } from "../../components/StatusBadge";

function Leads() {
  const { token } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Lead[]>("/leads/mine", token)
      .then(setLeads)
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-bold text-tm-navy">My Leads</h1>
      <p className="mt-1 text-sm text-tm-dark/70">Leads created when a buyer expresses interest in one of your listings.</p>

      {loading ? (
        <p className="mt-8 text-sm text-tm-dark/60">Loading…</p>
      ) : leads.length === 0 ? (
        <p className="mt-8 text-sm text-tm-dark/60">No leads yet.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {leads.map((lead) => (
            <Link key={lead.id} href={`/leads/${lead.id}`} className="tm-card flex items-center justify-between transition hover:shadow-md">
              <p className="text-sm text-tm-dark/70">Lead #{lead.id.slice(-8)} · updated {new Date(lead.updatedAt).toLocaleDateString()}</p>
              <StatusBadge status={lead.status} />
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

export default function LeadsPage() {
  return (
    <RequireAuth>
      <Leads />
    </RequireAuth>
  );
}
