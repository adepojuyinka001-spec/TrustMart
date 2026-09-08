"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "../../../../lib/api";
import type { AttributeDefinition, SubcategoryDetail } from "../../../../lib/types";
import { useAuth } from "../../../../lib/auth-context";
import { RequirePermission } from "../../../../components/RequirePermission";
import { Topbar } from "../../../../components/Topbar";

const DATA_TYPES = ["STRING", "NUMBER", "BOOLEAN", "ENUM", "MULTI_ENUM"] as const;

function LinkAttributeForm({
  subcategoryId,
  allAttributes,
  alreadyLinkedIds,
  onLinked,
}: {
  subcategoryId: string;
  allAttributes: AttributeDefinition[];
  alreadyLinkedIds: Set<string>;
  onLinked: () => void;
}) {
  const { token } = useAuth();
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [attributeId, setAttributeId] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newDataType, setNewDataType] = useState<(typeof DATA_TYPES)[number]>("STRING");
  const [required, setRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // De-duplicated by label+type: dev/test data can accumulate multiple attribute
  // definitions that are functionally identical (e.g. several "Bedrooms" rows from
  // repeated test runs before e2e tests were isolated onto their own database — see
  // docs/00-ssot/DECISION_LOG.md, 2026-09-08). Picking any one of them to reuse is
  // equally correct, so only the first is offered rather than confusing an admin with
  // a long list of indistinguishable duplicates.
  const seen = new Set<string>();
  const reusable = allAttributes.filter((a) => {
    if (alreadyLinkedIds.has(a.id)) return false;
    const dedupeKey = `${a.label.toLowerCase()}::${a.dataType}`;
    if (seen.has(dedupeKey)) return false;
    seen.add(dedupeKey);
    return true;
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      let targetAttributeId = attributeId;
      if (mode === "new") {
        const created = await api.post<{ id: string }>(
          "/attribute-definitions",
          { key: newKey, label: newLabel, dataType: newDataType },
          token,
        );
        targetAttributeId = created.id;
      }
      if (!targetAttributeId) {
        setError("Choose an attribute to link.");
        setSubmitting(false);
        return;
      }
      await api.post(`/subcategories/${subcategoryId}/attributes`, { attributeId: targetAttributeId, required }, token);
      setAttributeId("");
      setNewKey("");
      setNewLabel("");
      setRequired(false);
      onLinked();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not link attribute.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="tm-card space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("existing")}
          className={`tm-badge cursor-pointer ${mode === "existing" ? "bg-tm-navy text-tm-white" : "bg-tm-navy/10 text-tm-navy"}`}
        >
          Reuse existing attribute
        </button>
        <button
          type="button"
          onClick={() => setMode("new")}
          className={`tm-badge cursor-pointer ${mode === "new" ? "bg-tm-navy text-tm-white" : "bg-tm-navy/10 text-tm-navy"}`}
        >
          Create new attribute
        </button>
      </div>

      {mode === "existing" ? (
        reusable.length === 0 ? (
          <p className="text-sm text-tm-dark/60">
            No unlinked attributes to reuse yet — create a new one, or link one to another subcategory first.
          </p>
        ) : (
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-tm-dark/60">Attribute</span>
            <select required value={attributeId} onChange={(e) => setAttributeId(e.target.value)} className="tm-select">
              <option value="">Select an attribute…</option>
              {reusable.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label} ({a.dataType.toLowerCase()})
                </option>
              ))}
            </select>
          </label>
        )
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-tm-dark/60">Key</span>
            <input required value={newKey} onChange={(e) => setNewKey(e.target.value)} className="tm-input" placeholder="e.g. bedrooms" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-tm-dark/60">Label</span>
            <input required value={newLabel} onChange={(e) => setNewLabel(e.target.value)} className="tm-input" placeholder="e.g. Bedrooms" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-tm-dark/60">Data type</span>
            <select
              value={newDataType}
              onChange={(e) => setNewDataType(e.target.value as (typeof DATA_TYPES)[number])}
              className="tm-select"
            >
              {DATA_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-tm-dark/80">
        <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} />
        Required on listings/buyer requests in this subcategory
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={submitting} className="tm-btn-primary">
        {submitting ? "Linking…" : "Link Attribute"}
      </button>
    </form>
  );
}

function AdminSubcategoryDetail() {
  const params = useParams<{ id: string }>();
  const [detail, setDetail] = useState<SubcategoryDetail | null>(null);
  const [allAttributes, setAllAttributes] = useState<AttributeDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  function reload() {
    setLoading(true);
    Promise.all([
      api.get<SubcategoryDetail>(`/subcategories/${params.id}/attributes`),
      api.get<AttributeDefinition[]>("/attribute-definitions", token),
    ])
      .then(([sub, attrs]) => {
        setDetail(sub);
        setAllAttributes(attrs);
      })
      .finally(() => setLoading(false));
  }

  useEffect(reload, [params.id, token]);

  if (loading || !detail) {
    return (
      <>
        <Topbar title="Admin — Subcategory" />
        <main className="flex-1 p-6 text-sm text-tm-dark/60">Loading…</main>
      </>
    );
  }

  const linkedIds = new Set(detail.attributes.map((ca) => ca.attribute.id));

  return (
    <>
      <Topbar title={detail.label} subtitle={`${detail.category.label} → ${detail.label}`} />
      <main className="flex-1 space-y-6 bg-tm-navy/[0.02] p-6">
        <Link href="/admin/categories" className="text-sm font-medium text-tm-navy hover:text-tm-gold">
          ← Back to categories
        </Link>

        <div className="tm-card">
          <h2 className="font-semibold text-tm-navy">Linked attributes</h2>
          {detail.attributes.length === 0 ? (
            <p className="mt-3 text-sm text-tm-dark/60">No attributes linked yet — nothing will show on the listing form.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="border-b border-tm-navy/10 text-xs uppercase tracking-wide text-tm-dark/50">
                  <tr>
                    <th className="py-2 pr-4 font-semibold">Label</th>
                    <th className="py-2 pr-4 font-semibold">Key</th>
                    <th className="py-2 pr-4 font-semibold">Type</th>
                    <th className="py-2 font-semibold">Required</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-tm-navy/5">
                  {detail.attributes.map((ca) => (
                    <tr key={ca.id}>
                      <td className="py-2 pr-4 font-medium text-tm-dark">{ca.attribute.label}</td>
                      <td className="py-2 pr-4 text-tm-dark/50">{ca.attribute.key}</td>
                      <td className="py-2 pr-4 text-tm-dark/60">{ca.attribute.dataType.toLowerCase()}</td>
                      <td className="py-2">
                        {ca.required ? (
                          <span className="tm-badge bg-amber-100 text-amber-800">Required</span>
                        ) : (
                          <span className="tm-badge bg-gray-100 text-gray-600">Optional</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <LinkAttributeForm
          subcategoryId={detail.id}
          allAttributes={allAttributes}
          alreadyLinkedIds={linkedIds}
          onLinked={reload}
        />
      </main>
    </>
  );
}

export default function AdminSubcategoryPage() {
  return (
    <RequirePermission permission="category:manage">
      <AdminSubcategoryDetail />
    </RequirePermission>
  );
}
