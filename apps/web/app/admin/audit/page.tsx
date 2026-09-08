"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../../lib/api";
import type { AuditEvent } from "../../../lib/types";
import { useAuth } from "../../../lib/auth-context";
import { RequirePermission } from "../../../components/RequirePermission";
import { Topbar } from "../../../components/Topbar";

const PAGE_SIZE = 25;

function AdminAudit() {
  const { token } = useAuth();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [resourceType, setResourceType] = useState("");
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ take: String(PAGE_SIZE), skip: String(skip) });
    if (resourceType.trim()) params.set("resourceType", resourceType.trim());
    if (action.trim()) params.set("action", action.trim());

    api
      .get<{ items: AuditEvent[]; total: number }>(`/admin/audit-events?${params.toString()}`, token)
      .then((res) => {
        setEvents(res.items);
        setTotal(res.total);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load audit events."))
      .finally(() => setLoading(false));
  }, [token, skip, resourceType, action]);

  return (
    <>
      <Topbar title="Admin — Audit Log" subtitle="Append-only record of every mutating action" />
      <main className="flex-1 space-y-6 bg-tm-navy/[0.02] p-6">
        <Link href="/admin/analytics" className="text-sm font-medium text-tm-navy hover:text-tm-gold">
          ← Back to analytics
        </Link>

        <div className="tm-card flex flex-wrap gap-4">
          <div className="flex-1 min-w-[180px]">
            <label className="mb-1 block text-xs font-medium text-tm-dark/60">Resource type</label>
            <input
              value={resourceType}
              onChange={(e) => {
                setSkip(0);
                setResourceType(e.target.value);
              }}
              placeholder="e.g. Listing"
              className="tm-input"
            />
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="mb-1 block text-xs font-medium text-tm-dark/60">Action</label>
            <input
              value={action}
              onChange={(e) => {
                setSkip(0);
                setAction(e.target.value);
              }}
              placeholder="e.g. listing.create"
              className="tm-input"
            />
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-tm-dark/60">Loading…</p>
        ) : error ? (
          <p className="text-sm text-red-700">{error}</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-tm-dark/60">No audit events match this filter.</p>
        ) : (
          <div className="tm-card overflow-x-auto p-0">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-tm-navy/10 text-xs uppercase tracking-wide text-tm-dark/50">
                <tr>
                  <th className="px-4 py-3 font-semibold">When</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                  <th className="px-4 py-3 font-semibold">Resource</th>
                  <th className="px-4 py-3 font-semibold">Actor</th>
                  <th className="px-4 py-3 font-semibold">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tm-navy/5">
                {events.map((event) => (
                  <tr key={event.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-tm-dark/60">
                      {new Date(event.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-tm-navy">{event.action}</td>
                    <td className="px-4 py-3 text-tm-dark/80">
                      {event.resourceType}
                      {event.resourceId && (
                        <span className="ml-1 text-tm-dark/40">#{event.resourceId.slice(-8)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-tm-dark/60">{event.actorId ? `#${event.actorId.slice(-8)}` : "system"}</td>
                    <td className="px-4 py-3 text-tm-dark/40">{event.ipAddress ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              disabled={skip === 0}
              onClick={() => setSkip((s) => Math.max(0, s - PAGE_SIZE))}
              className="tm-btn-outline disabled:opacity-40"
            >
              Newer
            </button>
            <p className="text-tm-dark/60">
              {skip + 1}–{Math.min(skip + PAGE_SIZE, total)} of {total}
            </p>
            <button
              type="button"
              disabled={skip + PAGE_SIZE >= total}
              onClick={() => setSkip((s) => s + PAGE_SIZE)}
              className="tm-btn-outline disabled:opacity-40"
            >
              Older
            </button>
          </div>
        )}
      </main>
    </>
  );
}

export default function AdminAuditPage() {
  return (
    <RequirePermission permission="audit:read">
      <AdminAudit />
    </RequirePermission>
  );
}
