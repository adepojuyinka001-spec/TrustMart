"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "../../../lib/api";
import { nairaToMinorUnits } from "../../../lib/format";
import type { Category, CategoryAttribute } from "../../../lib/types";
import { useAuth } from "../../../lib/auth-context";
import { RequireAuth } from "../../../components/RequireAuth";

interface RequirementRow {
  attributeId: string;
  operator: string;
  value: string;
  requirementType: "HARD" | "PREFERRED";
}

function NewBuyerRequestForm() {
  const { token } = useAuth();
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategoryId, setSubcategoryId] = useState("");
  const [attributes, setAttributes] = useState<CategoryAttribute[]>([]);

  const [minBudget, setMinBudget] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [budgetFlexible, setBudgetFlexible] = useState(false);
  const [locations, setLocations] = useState("");
  const [locationFlexible, setLocationFlexible] = useState(true);
  const [requirements, setRequirements] = useState<RequirementRow[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get<Category[]>("/categories").then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    if (!subcategoryId) {
      setAttributes([]);
      return;
    }
    api
      .get<{ attributes: CategoryAttribute[] }>(`/subcategories/${subcategoryId}/attributes`)
      .then((res) => setAttributes(res.attributes))
      .catch(() => setAttributes([]));
    setRequirements([]);
  }, [subcategoryId]);

  function setRequirement(attributeId: string, value: string, requirementType: "HARD" | "PREFERRED") {
    setRequirements((prev) => {
      const rest = prev.filter((r) => r.attributeId !== attributeId);
      if (!value) return rest;
      return [...rest, { attributeId, operator: "EQUALS", value, requirementType }];
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!subcategoryId) {
      setError("Please choose a category.");
      return;
    }
    setSubmitting(true);
    try {
      const created = await api.post<{ id: string }>(
        "/buyer-requests",
        {
          subcategoryId,
          minBudgetMinorUnits: minBudget ? nairaToMinorUnits(Number(minBudget)) : undefined,
          maxBudgetMinorUnits: maxBudget ? nairaToMinorUnits(Number(maxBudget)) : undefined,
          budgetFlexible,
          preferredLocations: locations
            .split(",")
            .map((l) => l.trim())
            .filter(Boolean),
          locationFlexible,
          requirements: requirements.length > 0 ? requirements : undefined,
        },
        token,
      );
      router.push("/buyer-requests");
      void created;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create buyer request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-bold text-tm-navy">New Buyer Request</h1>
      <p className="mt-1 text-sm text-tm-dark/70">
        Created as DRAFT — review it and activate from "My Buyer Requests" to start matching.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-tm-dark/80">Category</span>
          <select required value={subcategoryId} onChange={(e) => setSubcategoryId(e.target.value)} className="tm-select">
            <option value="">Select a category…</option>
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

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-tm-dark/80">Min budget (₦)</span>
            <input type="number" min={0} value={minBudget} onChange={(e) => setMinBudget(e.target.value)} className="tm-input" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-tm-dark/80">Max budget (₦)</span>
            <input type="number" min={0} value={maxBudget} onChange={(e) => setMaxBudget(e.target.value)} className="tm-input" />
          </label>
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={budgetFlexible} onChange={(e) => setBudgetFlexible(e.target.checked)} />
          <span className="text-sm text-tm-dark/80">Budget is flexible (preferred, not a hard cutoff)</span>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-tm-dark/80">Preferred locations (comma-separated)</span>
          <input value={locations} onChange={(e) => setLocations(e.target.value)} placeholder="Lekki, Ikeja" className="tm-input" />
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={locationFlexible} onChange={(e) => setLocationFlexible(e.target.checked)} />
          <span className="text-sm text-tm-dark/80">Location is flexible (preferred, not a hard requirement)</span>
        </label>

        {attributes.length > 0 && (
          <div className="space-y-4 border-t border-tm-navy/10 pt-5">
            <h2 className="text-sm font-semibold text-tm-navy">Category requirements</h2>
            {attributes.map((ca) => (
              <div key={ca.attribute.id} className="flex items-end gap-3">
                <label className="flex-1">
                  <span className="mb-1 block text-sm font-medium text-tm-dark/80">{ca.attribute.label}</span>
                  <input
                    type={ca.attribute.dataType === "NUMBER" ? "number" : "text"}
                    onChange={(e) =>
                      setRequirement(
                        ca.attribute.id,
                        e.target.value,
                        requirements.find((r) => r.attributeId === ca.attribute.id)?.requirementType ??
                          (ca.required ? "HARD" : "PREFERRED"),
                      )
                    }
                    className="tm-input"
                  />
                </label>
                <select
                  defaultValue={ca.required ? "HARD" : "PREFERRED"}
                  onChange={(e) => {
                    const existing = requirements.find((r) => r.attributeId === ca.attribute.id);
                    if (existing) setRequirement(ca.attribute.id, existing.value, e.target.value as "HARD" | "PREFERRED");
                  }}
                  className="tm-select w-32"
                >
                  <option value="HARD">Hard</option>
                  <option value="PREFERRED">Preferred</option>
                </select>
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={submitting} className="tm-btn-primary w-full">
          {submitting ? "Creating…" : "Create Buyer Request (Draft)"}
        </button>
      </form>
    </main>
  );
}

export default function NewBuyerRequestPage() {
  return (
    <RequireAuth>
      <NewBuyerRequestForm />
    </RequireAuth>
  );
}
