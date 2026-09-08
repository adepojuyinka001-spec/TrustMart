"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "../../../lib/api";
import type { PlatformConfig } from "../../../lib/types";
import { useAuth } from "../../../lib/auth-context";
import { RequirePermission } from "../../../components/RequirePermission";
import { Topbar } from "../../../components/Topbar";

function ConfigRow({ config, canWrite, onSaved }: { config: PlatformConfig; canWrite: boolean; onSaved: () => void }) {
  const { token } = useAuth();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(config.value);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.put(`/platform-config/${config.key}`, { valueType: config.valueType, value, description: config.description }, token);
      setEditing(false);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="tm-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-sm font-semibold text-tm-navy">{config.key}</p>
          {config.description && <p className="mt-0.5 text-xs text-tm-dark/60">{config.description}</p>}
        </div>
        <span className="tm-badge shrink-0 bg-tm-navy/10 text-tm-navy">{config.valueType}</span>
      </div>

      {editing ? (
        <form onSubmit={handleSubmit} className="mt-3 flex flex-wrap items-center gap-2">
          {config.valueType === "BOOLEAN" ? (
            <select value={value} onChange={(e) => setValue(e.target.value)} className="tm-select max-w-[160px]">
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          ) : config.valueType === "JSON" ? (
            <textarea value={value} onChange={(e) => setValue(e.target.value)} rows={3} className="tm-input font-mono text-xs" />
          ) : (
            <input
              type={config.valueType === "NUMBER" ? "number" : "text"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="tm-input max-w-[220px]"
            />
          )}
          <button type="submit" disabled={submitting} className="tm-btn-primary px-3 py-1.5 text-xs">
            {submitting ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setValue(config.value);
            }}
            className="tm-btn-outline px-3 py-1.5 text-xs"
          >
            Cancel
          </button>
          {error && <p className="w-full text-xs text-red-600">{error}</p>}
        </form>
      ) : (
        <div className="mt-3 flex items-center justify-between">
          <p className="font-mono text-sm text-tm-dark">{config.value}</p>
          <div className="flex items-center gap-3">
            <span className="text-xs text-tm-dark/40">
              v{config.version} · {new Date(config.updatedAt).toLocaleDateString()}
            </span>
            {canWrite && (
              <button type="button" onClick={() => setEditing(true)} className="text-xs font-semibold text-tm-navy hover:text-tm-gold">
                Edit
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AdminConfig() {
  const { token, user } = useAuth();
  const [configs, setConfigs] = useState<PlatformConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const canWrite = user?.permissions?.includes("platform_config:write") ?? false;

  function reload() {
    setLoading(true);
    api
      .get<PlatformConfig[]>("/platform-config", token)
      .then(setConfigs)
      .finally(() => setLoading(false));
  }

  useEffect(reload, [token]);

  return (
    <>
      <Topbar
        title="Admin — Platform Configuration"
        subtitle="Every configurable value used across matching, listings, subscriptions, and Escrow (CLAUDE.md: never hard-code)"
      />
      <main className="flex-1 space-y-4 bg-tm-navy/[0.02] p-6">
        {!canWrite && (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Your account can view configuration but not edit it.
          </p>
        )}

        {loading ? (
          <p className="text-sm text-tm-dark/60">Loading…</p>
        ) : configs.length === 0 ? (
          <p className="text-sm text-tm-dark/60">No configuration values yet.</p>
        ) : (
          configs.map((c) => <ConfigRow key={c.id} config={c} canWrite={canWrite} onSaved={reload} />)
        )}
      </main>
    </>
  );
}

export default function AdminConfigPage() {
  return (
    <RequirePermission permission="platform_config:read">
      <AdminConfig />
    </RequirePermission>
  );
}
