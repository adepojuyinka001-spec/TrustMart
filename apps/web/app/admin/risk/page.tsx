"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "../../../lib/api";
import type { RiskCase, ScanResult } from "../../../lib/types";
import { useAuth } from "../../../lib/auth-context";
import { RequirePermission } from "../../../components/RequirePermission";
import { Topbar } from "../../../components/Topbar";
import { StatusBadge } from "../../../components/StatusBadge";

const STATUS_FILTERS = ["OPEN", "DISMISSED", "ACTIONED", ""];
const PAGE_SIZE = 25;

const CATEGORY_LABEL: Record<string, string> = {
  DUPLICATE_ACCOUNTS: "Duplicate Accounts",
  SUSPICIOUS_PRICING: "Suspicious Pricing",
};

function ReviewControls({ riskCase, onReviewed }: { riskCase: RiskCase; onReviewed: () => void }) {
  const { token } = useAuth();
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState<"DISMISSED" | "ACTIONED" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function review(status: "DISMISSED" | "ACTIONED") {
    setSubmitting(status);
    setError(null);
    try {
      await api.patch(`/admin/risk-cases/${riskCase.id}/review`, { status, notes: notes || undefined }, token);
      onReviewed();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save review.");
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="mt-3 space-y-2 border-t border-tm-navy/10 pt-3">
      <input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Review notes (optional)"
        className="tm-input"
      />
      {error && <p className="text-xs text-red-700">{error}</p>}
      <div className="flex gap-2">
        <button type="button" disabled={!!submitting} onClick={() => review("DISMISSED")} className="tm-btn-outline disabled:opacity-40">
          {submitting === "DISMISSED" ? "Dismissing…" : "Dismiss"}
        </button>
        <button type="button" disabled={!!submitting} onClick={() => review("ACTIONED")} className="tm-btn-gold disabled:opacity-40">
          {submitting === "ACTIONED" ? "Saving…" : "Mark Actioned"}
        </button>
      </div>
    </div>
  );
}

function AdminRisk() {
  const { token } = useAuth();
  const [cases, setCases] = useState<RiskCase[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("OPEN");
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    const params = new URLSearchParams({ take: String(PAGE_SIZE), skip: String(skip) });
    if (status) params.set("status", status);
    api
      .get<{ items: RiskCase[]; total: number }>(`/admin/risk-cases?${params.toString()}`, token)
      .then((res) => {
        setCases(res.items);
        setTotal(res.total);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load risk cases."))
      .finally(() => setLoading(false));
  }, [token, status, skip]);

  useEffect(() => {
    load();
  }, [load]);

  async function runScan() {
    setScanning(true);
    setError(null);
    try {
      const result = await api.post<ScanResult>("/admin/risk-cases/scan", undefined, token);
      setScanResult(result);
      setSkip(0);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Scan failed.");
    } finally {
      setScanning(false);
    }
  }

  return (
    <>
      <Topbar title="Admin — TrustGuard Risk Queue" subtitle="Deterministic detection only — every case needs human review" />
      <main className="flex-1 space-y-4 bg-tm-navy/[0.02] p-6">
        <div className="tm-card space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-tm-navy">Run a scan</h2>
              <p className="mt-1 text-xs text-tm-dark/60">
                Checks for accounts sharing a registration IP, and listings priced far outside their subcategory&apos;s
                typical range. Only ever flags — nothing here suspends an account or removes a listing.
              </p>
            </div>
            <button type="button" onClick={runScan} disabled={scanning} className="tm-btn-gold shrink-0 disabled:opacity-50">
              {scanning ? "Scanning…" : "Run Scan Now"}
            </button>
          </div>
          {scanResult && (
            <p className="text-xs text-tm-dark/60">
              Last scan: {scanResult.duplicateAccounts} duplicate-account case(s), {scanResult.suspiciousPricing}{" "}
              suspicious-pricing case(s) newly flagged.
            </p>
          )}
        </div>

        <div className="tm-card">
          <label className="block max-w-xs">
            <span className="mb-1 block text-xs font-medium text-tm-dark/60">Filter by status</span>
            <select
              value={status}
              onChange={(e) => {
                setSkip(0);
                setStatus(e.target.value);
              }}
              className="tm-select"
            >
              {STATUS_FILTERS.map((s) => (
                <option key={s} value={s}>
                  {s === "" ? "All statuses" : s}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error && <p className="text-sm text-red-700">{error}</p>}

        {loading ? (
          <p className="text-sm text-tm-dark/60">Loading…</p>
        ) : cases.length === 0 ? (
          <p className="text-sm text-tm-dark/60">No risk cases match this filter.</p>
        ) : (
          <div className="space-y-2">
            {cases.map((c) => (
              <div key={c.id} className="tm-card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-tm-dark">{CATEGORY_LABEL[c.category] ?? c.category}</p>
                    <p className="mt-0.5 text-xs text-tm-dark/50">
                      {c.subjectType} #{c.subjectId.slice(-12)} · detected {new Date(c.detectedAt).toLocaleString()}
                    </p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
                <p className="mt-2 text-sm text-tm-dark/80">{c.description}</p>
                {c.status !== "OPEN" && (
                  <p className="mt-2 text-xs text-tm-dark/50">
                    Reviewed {c.reviewedAt && new Date(c.reviewedAt).toLocaleString()}
                    {c.reviewNotes && ` — "${c.reviewNotes}"`}
                  </p>
                )}
                {c.status === "OPEN" && <ReviewControls riskCase={c} onReviewed={load} />}
              </div>
            ))}
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

export default function AdminRiskPage() {
  return (
    <RequirePermission permission="risk:manage">
      <AdminRisk />
    </RequirePermission>
  );
}
