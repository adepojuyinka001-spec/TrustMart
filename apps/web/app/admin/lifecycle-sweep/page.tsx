"use client";

import { useState } from "react";
import { api, ApiError } from "../../../lib/api";
import { useAuth } from "../../../lib/auth-context";
import { RequirePermission } from "../../../components/RequirePermission";
import { Topbar } from "../../../components/Topbar";
import { ClipboardIcon } from "../../../components/icons";

interface SweepResult {
  warned: number;
  expired: number;
}

function LifecycleSweep() {
  const { token } = useAuth();
  const [result, setResult] = useState<SweepResult | null>(null);
  const [runAt, setRunAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  async function runSweep() {
    setError(null);
    setRunning(true);
    try {
      const res = await api.post<SweepResult>("/listings/lifecycle/sweep", undefined, token);
      setResult(res);
      setRunAt(new Date());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sweep failed.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <>
      <Topbar title="Admin — Listing Lifecycle Sweep" subtitle="Manually run the ACTIVE → EXPIRING → EXPIRED sweep" />
      <main className="flex-1 space-y-4 bg-tm-navy/[0.02] p-6">
        <div className="tm-card space-y-3">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tm-navy/10 text-tm-navy">
              <ClipboardIcon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-semibold text-tm-navy">What this does</h2>
              <p className="mt-1 text-sm text-tm-dark/70">
                Moves <strong>ACTIVE</strong> listings within the configured warning window to{" "}
                <strong>EXPIRING</strong>, and moves <strong>ACTIVE</strong>/<strong>EXPIRING</strong> listings past
                their expiry date to <strong>EXPIRED</strong>. Deterministic backend logic — never AI or n8n
                decided, and idempotent, so running it more than once is always safe. Normally n8n calls this on a
                schedule; this page is a manual trigger for the same authenticated endpoint.
              </p>
            </div>
          </div>

          <button type="button" onClick={runSweep} disabled={running} className="tm-btn-gold disabled:opacity-50">
            {running ? "Running…" : "Run Sweep Now"}
          </button>

          {error && <p className="text-sm text-red-700">{error}</p>}

          {result && runAt && (
            <div className="rounded-md border border-tm-navy/10 bg-tm-navy/[0.03] p-4">
              <p className="text-sm font-semibold text-tm-navy">Sweep completed at {runAt.toLocaleTimeString()}</p>
              <div className="mt-2 flex gap-6 text-sm">
                <span>
                  <span className="font-bold text-tm-dark">{result.warned}</span>{" "}
                  <span className="text-tm-dark/60">moved to EXPIRING</span>
                </span>
                <span>
                  <span className="font-bold text-tm-dark">{result.expired}</span>{" "}
                  <span className="text-tm-dark/60">moved to EXPIRED</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

export default function LifecycleSweepPage() {
  return (
    <RequirePermission permission="listing:lifecycle_sweep">
      <LifecycleSweep />
    </RequirePermission>
  );
}
