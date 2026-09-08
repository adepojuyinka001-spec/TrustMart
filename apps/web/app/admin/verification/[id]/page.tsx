"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "../../../../lib/api";
import type { VerificationCase } from "../../../../lib/types";
import { useAuth } from "../../../../lib/auth-context";
import { RequirePermission } from "../../../../components/RequirePermission";
import { Topbar } from "../../../../components/Topbar";
import { StatusBadge } from "../../../../components/StatusBadge";

const STATUSES = ["PENDING", "IN_REVIEW", "APPROVED", "REJECTED", "MORE_INFO_REQUIRED"] as const;

function AdminVerificationDetail() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [item, setItem] = useState<VerificationCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("PENDING");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<VerificationCase>(`/admin/verification-cases/${id}`, token)
      .then((c) => {
        setItem(c);
        setStatus(c.status);
        setNotes(c.notes ?? "");
      })
      .finally(() => setLoading(false));
  }, [id, token]);

  useEffect(load, [load]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.patch(`/verification-cases/${id}/status`, { status, notes: notes || undefined }, token);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update status.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !item) {
    return (
      <>
        <Topbar title="Admin — Verification Case" />
        <main className="flex-1 p-6 text-sm text-tm-dark/60">Loading…</main>
      </>
    );
  }

  return (
    <>
      <Topbar title={item.subjectType === "USER" ? item.user?.email ?? "Verification case" : item.business?.name ?? "Verification case"} />
      <main className="mx-auto max-w-2xl flex-1 space-y-6 p-6">
        <Link href="/admin/verification" className="text-sm font-medium text-tm-navy hover:text-tm-gold">
          ← Back to verification queue
        </Link>

        <div className="tm-card">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-tm-navy">Overview</h2>
            <StatusBadge status={item.status} />
          </div>
          <dl className="mt-3 space-y-1 text-sm text-tm-dark/70">
            <div>
              <dt className="inline font-medium text-tm-dark/80">Subject type: </dt>
              <dd className="inline">{item.subjectType}</dd>
            </div>
            <div>
              <dt className="inline font-medium text-tm-dark/80">Created: </dt>
              <dd className="inline">{new Date(item.createdAt).toLocaleString()}</dd>
            </div>
            {item.notes && (
              <div>
                <dt className="inline font-medium text-tm-dark/80">Current notes: </dt>
                <dd className="inline">{item.notes}</dd>
              </div>
            )}
          </dl>
        </div>

        <form onSubmit={handleSubmit} className="tm-card space-y-4">
          <h2 className="font-semibold text-tm-navy">Update status</h2>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-tm-dark/60">Status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value as (typeof STATUSES)[number])} className="tm-select">
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-tm-dark/60">Notes</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="tm-input" />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={submitting} className="tm-btn-primary">
            {submitting ? "Saving…" : "Save"}
          </button>
        </form>
      </main>
    </>
  );
}

export default function AdminVerificationDetailPage() {
  return (
    <RequirePermission permission="verification:review">
      <AdminVerificationDetail />
    </RequirePermission>
  );
}
