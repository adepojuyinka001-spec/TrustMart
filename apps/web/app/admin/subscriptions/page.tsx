"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "../../../lib/api";
import { formatMoney, nairaToMinorUnits } from "../../../lib/format";
import type { SubscriptionPlan } from "../../../lib/types";
import { useAuth } from "../../../lib/auth-context";
import { RequirePermission } from "../../../components/RequirePermission";
import { Topbar } from "../../../components/Topbar";
import { PlusIcon } from "../../../components/icons";

const BILLING_PERIODS = ["NONE", "WEEKLY", "MONTHLY"] as const;

function slugify(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/(^_|_$)/g, "");
}

function EntitlementForm({ planId, onSaved }: { planId: string; onSaved: () => void }) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const valueType = value === "true" || value === "false" ? "BOOLEAN" : Number.isFinite(Number(value)) && value.trim() !== "" ? "NUMBER" : "STRING";
      await api.post(`/subscription-plans/${planId}/entitlements`, { key, valueType, value }, token);
      setKey("");
      setValue("");
      setOpen(false);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save entitlement.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs font-semibold text-tm-navy hover:text-tm-gold">
        + Add/Edit Entitlement
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex flex-wrap items-end gap-2">
      <input
        required
        autoFocus
        placeholder="key (e.g. listing_limit)"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        className="tm-input max-w-[180px] text-sm"
      />
      <input
        required
        placeholder="value"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="tm-input max-w-[120px] text-sm"
      />
      <button type="submit" disabled={submitting} className="tm-btn-primary px-3 py-1.5 text-xs">
        {submitting ? "Saving…" : "Save"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="tm-btn-outline px-3 py-1.5 text-xs">
        Cancel
      </button>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </form>
  );
}

function PlanCard({ plan, onChanged }: { plan: SubscriptionPlan; onChanged: () => void }) {
  const { token } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleActive() {
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/subscription-plans/${plan.id}`, { isActive: !plan.isActive }, token);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update plan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tm-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-tm-navy">{plan.label}</h2>
            <span className={`tm-badge ${plan.isActive ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"}`}>
              {plan.isActive ? "Active" : "Inactive"}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-tm-dark/40">
            {plan.key} · {plan.billingPeriod.toLowerCase()}
          </p>
          {plan.description && <p className="mt-1 text-sm text-tm-dark/60">{plan.description}</p>}
        </div>
        <p className="text-sm font-bold text-tm-navy">{formatMoney(plan.priceMinorUnits, plan.currency)}</p>
      </div>

      {plan.entitlements.length > 0 && (
        <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-tm-dark/60">
          {plan.entitlements.map((e) => (
            <div key={e.key}>
              <dt className="inline font-medium text-tm-dark/80">{e.key}: </dt>
              <dd className="inline">{e.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-3 flex items-center gap-4">
        <button type="button" disabled={busy} onClick={toggleActive} className="tm-btn-outline px-3 py-1.5 text-xs">
          {busy ? "Working…" : plan.isActive ? "Deactivate" : "Activate"}
        </button>
        <EntitlementForm planId={plan.id} onSaved={onChanged} />
      </div>
    </div>
  );
}

function AddPlanForm({ onCreated }: { onCreated: () => void }) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [priceNaira, setPriceNaira] = useState("");
  const [billingPeriod, setBillingPeriod] = useState<(typeof BILLING_PERIODS)[number]>("MONTHLY");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post(
        "/subscription-plans",
        {
          key: slugify(label),
          label,
          priceMinorUnits: nairaToMinorUnits(Number(priceNaira) || 0),
          billingPeriod,
        },
        token,
      );
      setLabel("");
      setPriceNaira("");
      setOpen(false);
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create plan.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="tm-btn-gold inline-flex items-center gap-1.5">
        <PlusIcon className="h-4 w-4" /> Add Plan
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="tm-card flex flex-wrap items-end gap-3">
      <label className="min-w-[180px]">
        <span className="mb-1 block text-xs font-medium text-tm-dark/60">Plan name</span>
        <input required autoFocus value={label} onChange={(e) => setLabel(e.target.value)} className="tm-input" />
      </label>
      <label className="w-32">
        <span className="mb-1 block text-xs font-medium text-tm-dark/60">Price (₦)</span>
        <input required type="number" min={0} value={priceNaira} onChange={(e) => setPriceNaira(e.target.value)} className="tm-input" />
      </label>
      <label className="w-40">
        <span className="mb-1 block text-xs font-medium text-tm-dark/60">Billing period</span>
        <select value={billingPeriod} onChange={(e) => setBillingPeriod(e.target.value as (typeof BILLING_PERIODS)[number])} className="tm-select">
          {BILLING_PERIODS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={submitting} className="tm-btn-primary">
        {submitting ? "Creating…" : "Create"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="tm-btn-outline">
        Cancel
      </button>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </form>
  );
}

function AdminSubscriptions() {
  const { token } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  function reload() {
    setLoading(true);
    api
      .get<SubscriptionPlan[]>("/subscription-plans/all", token)
      .then(setPlans)
      .finally(() => setLoading(false));
  }

  useEffect(reload, [token]);

  return (
    <>
      <Topbar
        title="Admin — Subscription Plans"
        subtitle="Catalog only — no activation/payment path exists yet (Open Decision #1)"
      />
      <main className="flex-1 space-y-4 bg-tm-navy/[0.02] p-6">
        <div className="flex justify-end">
          <AddPlanForm onCreated={reload} />
        </div>

        {loading ? (
          <p className="text-sm text-tm-dark/60">Loading…</p>
        ) : plans.length === 0 ? (
          <p className="text-sm text-tm-dark/60">No plans yet.</p>
        ) : (
          plans.map((plan) => <PlanCard key={plan.id} plan={plan} onChanged={reload} />)
        )}
      </main>
    </>
  );
}

export default function AdminSubscriptionsPage() {
  return (
    <RequirePermission permission="subscription:manage">
      <AdminSubscriptions />
    </RequirePermission>
  );
}
