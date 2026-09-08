"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { api, ApiError } from "../../../lib/api";
import type { Category } from "../../../lib/types";
import { useAuth } from "../../../lib/auth-context";
import { RequirePermission } from "../../../components/RequirePermission";
import { Topbar } from "../../../components/Topbar";
import { PlusIcon } from "../../../components/icons";

function slugify(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function AddCategoryForm({ onCreated }: { onCreated: () => void }) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/categories", { key: slugify(label), label }, token);
      setLabel("");
      setOpen(false);
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create category.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="tm-btn-gold inline-flex items-center gap-1.5">
        <PlusIcon className="h-4 w-4" /> Add Category
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="tm-card flex flex-wrap items-end gap-3">
      <label className="flex-1 min-w-[200px]">
        <span className="mb-1 block text-xs font-medium text-tm-dark/60">Category name</span>
        <input required autoFocus value={label} onChange={(e) => setLabel(e.target.value)} className="tm-input" />
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

function AddSubcategoryForm({ categoryId, onCreated }: { categoryId: string; onCreated: () => void }) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post(`/categories/${categoryId}/subcategories`, { key: slugify(label), label }, token);
      setLabel("");
      setOpen(false);
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create subcategory.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs font-semibold text-tm-navy hover:text-tm-gold">
        + Add Subcategory
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex flex-wrap items-end gap-2">
      <input
        required
        autoFocus
        placeholder="Subcategory name"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        className="tm-input max-w-[200px] text-sm"
      />
      <button type="submit" disabled={submitting} className="tm-btn-primary px-3 py-1.5 text-xs">
        {submitting ? "Creating…" : "Create"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="tm-btn-outline px-3 py-1.5 text-xs">
        Cancel
      </button>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </form>
  );
}

function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  function reload() {
    setLoading(true);
    api
      .get<Category[]>("/categories")
      .then(setCategories)
      .finally(() => setLoading(false));
  }

  useEffect(reload, []);

  return (
    <>
      <Topbar title="Admin — Categories" subtitle="Category → Subcategory → Dynamic Attributes (CLAUDE.md SS6)" />
      <main className="flex-1 space-y-6 bg-tm-navy/[0.02] p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-tm-dark/60">
            Changes here are live immediately for every buyer/seller — this drives the actual category picker and
            listing/buyer-request forms.
          </p>
          <AddCategoryForm onCreated={reload} />
        </div>

        {loading ? (
          <p className="text-sm text-tm-dark/60">Loading…</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {categories.map((category) => (
              <div key={category.id} className="tm-card">
                <div className="flex items-baseline justify-between">
                  <h2 className="font-semibold text-tm-navy">{category.label}</h2>
                  <span className="text-xs text-tm-dark/40">{category.key}</span>
                </div>
                <div className="mt-3 space-y-1.5">
                  {category.subcategories.length === 0 ? (
                    <p className="text-sm text-tm-dark/50">No subcategories yet.</p>
                  ) : (
                    category.subcategories.map((sub) => (
                      <Link
                        key={sub.id}
                        href={`/admin/categories/${sub.id}`}
                        className="flex items-center justify-between rounded-md border border-tm-navy/10 px-3 py-2 text-sm transition hover:bg-tm-navy/[0.03]"
                      >
                        <span className="text-tm-dark">{sub.label}</span>
                        <span className="text-xs text-tm-dark/40">Manage attributes →</span>
                      </Link>
                    ))
                  )}
                </div>
                <div className="mt-3">
                  <AddSubcategoryForm categoryId={category.id} onCreated={reload} />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

export default function AdminCategoriesPage() {
  return (
    <RequirePermission permission="category:manage">
      <AdminCategories />
    </RequirePermission>
  );
}
