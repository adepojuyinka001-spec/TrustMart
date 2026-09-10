"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "../../../lib/api";
import type { Category, CategoryAttribute, MatchingProfile, SubcategoryDetail } from "../../../lib/types";
import { useAuth } from "../../../lib/auth-context";
import { RequirePermission } from "../../../components/RequirePermission";
import { Topbar } from "../../../components/Topbar";

function WeightsForm({ categories, profiles, onSaved }: { categories: Category[]; profiles: MatchingProfile[]; onSaved: () => void }) {
  const { token } = useAuth();
  const [subcategoryId, setSubcategoryId] = useState("");
  const [attributes, setAttributes] = useState<CategoryAttribute[]>([]);
  const [weights, setWeights] = useState<Record<string, string>>({});
  const [threshold, setThreshold] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!subcategoryId) {
      setAttributes([]);
      return;
    }
    api.get<SubcategoryDetail>(`/subcategories/${subcategoryId}/attributes`).then((detail) => {
      setAttributes(detail.attributes);
      const existing = profiles.find((p) => p.subcategoryId === subcategoryId);
      const nextWeights: Record<string, string> = {};
      for (const ca of detail.attributes) {
        const current = existing?.criteria.find((c) => c.attributeId === ca.attribute.id);
        nextWeights[ca.attribute.id] = current ? String(current.defaultWeight) : "0";
      }
      setWeights(nextWeights);
      setThreshold(existing?.thresholdOverridePercent != null ? String(existing.thresholdOverridePercent) : "");
    });
  }, [subcategoryId, profiles]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const criteria = Object.entries(weights)
        .filter(([, w]) => Number(w) > 0)
        .map(([attributeId, w]) => ({ attributeId, defaultWeight: Number(w) }));
      await api.post(
        "/matching-profiles",
        {
          subcategoryId,
          criteria,
          thresholdOverridePercent: threshold ? Number(threshold) : undefined,
        },
        token,
      );
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save weights.");
    } finally {
      setSubmitting(false);
    }
  }

  const totalWeight = Object.values(weights).reduce((sum, w) => sum + (Number(w) || 0), 0);

  return (
    <form onSubmit={handleSubmit} className="tm-card space-y-4">
      <h2 className="font-semibold text-tm-navy">Set weights for a subcategory</h2>
      <p className="text-xs text-tm-dark/60">
        Saving creates a new versioned profile and deactivates the previous one — existing scored matches keep pointing at
        whichever version scored them (CLAUDE.md SS9).
      </p>

      <label className="block max-w-sm">
        <span className="mb-1 block text-xs font-medium text-tm-dark/60">Subcategory</span>
        <select required value={subcategoryId} onChange={(e) => setSubcategoryId(e.target.value)} className="tm-select">
          <option value="">Select a subcategory…</option>
          {categories.map((category) => (
            <optgroup key={category.id} label={category.label}>
              {category.subcategories.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      {subcategoryId && attributes.length === 0 && (
        <p className="text-sm text-tm-dark/60">This subcategory has no linked attributes to weight yet — add some under Categories first.</p>
      )}

      {attributes.length > 0 && (
        <div className="space-y-3">
          {attributes.map((ca) => (
            <label key={ca.attribute.id} className="flex items-center justify-between gap-4">
              <span className="text-sm text-tm-dark/80">{ca.attribute.label}</span>
              <input
                type="number"
                min={0}
                max={100}
                value={weights[ca.attribute.id] ?? "0"}
                onChange={(e) => setWeights((prev) => ({ ...prev, [ca.attribute.id]: e.target.value }))}
                className="tm-input w-24 text-right"
              />
            </label>
          ))}
          <p className={`text-xs ${totalWeight === 100 ? "text-emerald-700" : "text-amber-700"}`}>
            Total: {totalWeight}% {totalWeight !== 100 && "— weights are typically expected to sum to 100%"}
          </p>
        </div>
      )}

      <label className="block max-w-xs">
        <span className="mb-1 block text-xs font-medium text-tm-dark/60">Threshold override % (optional)</span>
        <input
          type="number"
          min={0}
          max={100}
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          placeholder="Use platform default"
          className="tm-input"
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={submitting || !subcategoryId} className="tm-btn-primary">
        {submitting ? "Saving…" : "Save New Version"}
      </button>
    </form>
  );
}

function AdminMatching() {
  const { token } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [profiles, setProfiles] = useState<MatchingProfile[]>([]);
  const [loading, setLoading] = useState(true);

  function reload() {
    setLoading(true);
    Promise.all([api.get<Category[]>("/categories"), api.get<MatchingProfile[]>("/matching-profiles", token)])
      .then(([cats, profs]) => {
        setCategories(cats);
        setProfiles(profs);
      })
      .finally(() => setLoading(false));
  }

  useEffect(reload, [token]);

  return (
    <>
      <Topbar
        title="Admin — Matching Weights"
        subtitle="Per-category weight overrides (CLAUDE.md SS9) — global defaults live under Platform Config"
      />
      <main className="flex-1 space-y-6 bg-tm-navy/[0.02] p-6">
        {loading ? (
          <p className="text-sm text-tm-dark/60">Loading…</p>
        ) : (
          <>
            <div className="tm-card">
              <h2 className="font-semibold text-tm-navy">Active custom profiles</h2>
              {profiles.length === 0 ? (
                <p className="mt-2 text-sm text-tm-dark/60">
                  No subcategory has a custom weight profile yet — every subcategory currently runs on the Matching
                  Engine's built-in defaults.
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  {profiles.map((p) => (
                    <div key={p.id} className="rounded-md border border-tm-navy/10 p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-tm-dark">
                          {p.subcategory.category.label} → {p.subcategory.label}
                        </p>
                        <span className="tm-badge bg-tm-navy/10 text-tm-navy">v{p.version}</span>
                      </div>
                      {p.thresholdOverridePercent != null && (
                        <p className="mt-1 text-xs text-tm-dark/60">Threshold override: {p.thresholdOverridePercent}%</p>
                      )}
                      <p className="mt-1 text-xs text-tm-dark/60">
                        {p.criteria.map((c) => `${c.attribute.label} ${c.defaultWeight}%`).join(" · ")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <WeightsForm categories={categories} profiles={profiles} onSaved={reload} />
          </>
        )}
      </main>
    </>
  );
}

export default function AdminMatchingPage() {
  return (
    <RequirePermission permission="matching:manage">
      <AdminMatching />
    </RequirePermission>
  );
}
