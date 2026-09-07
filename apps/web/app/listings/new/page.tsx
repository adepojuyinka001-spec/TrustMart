"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "../../../lib/api";
import { nairaToMinorUnits } from "../../../lib/format";
import type { Category, CategoryAttribute } from "../../../lib/types";
import { useAuth } from "../../../lib/auth-context";
import { RequireAuth } from "../../../components/RequireAuth";

function NewListingForm() {
  const { token } = useAuth();
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategoryId, setSubcategoryId] = useState("");
  const [attributes, setAttributes] = useState<CategoryAttribute[]>([]);
  const [attributeValues, setAttributeValues] = useState<Record<string, string>>({});

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceNaira, setPriceNaira] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [negotiable, setNegotiable] = useState(false);

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
  }, [subcategoryId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!subcategoryId) {
      setError("Please choose a category.");
      return;
    }

    const missingRequired = attributes.find((ca) => ca.required && !attributeValues[ca.attribute.id]);
    if (missingRequired) {
      setError(`"${missingRequired.attribute.label}" is required.`);
      return;
    }

    setSubmitting(true);
    try {
      const listing = await api.post<{ id: string }>(
        "/listings",
        {
          subcategoryId,
          title,
          description,
          askingPriceMinorUnits: nairaToMinorUnits(Number(priceNaira)),
          negotiable,
          city: city || undefined,
          state: state || undefined,
          attributeValues: Object.entries(attributeValues)
            .filter(([, value]) => value !== "")
            .map(([attributeId, value]) => ({ attributeId, value })),
        },
        token,
      );
      router.push(`/listings/${listing.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create listing.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-bold text-tm-navy">Post a Listing</h1>
      <p className="mt-1 text-sm text-tm-dark/70">
        Your listing starts as a DRAFT. Submit it for moderation once you're ready.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-tm-dark/80">Category</span>
          <select
            required
            value={subcategoryId}
            onChange={(e) => {
              setSubcategoryId(e.target.value);
              setAttributeValues({});
            }}
            className="tm-select"
          >
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

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-tm-dark/80">Title</span>
          <input required value={title} onChange={(e) => setTitle(e.target.value)} className="tm-input" />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-tm-dark/80">Description</span>
          <textarea
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="tm-input"
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-tm-dark/80">Price (₦)</span>
            <input
              required
              type="number"
              min={0}
              step="0.01"
              value={priceNaira}
              onChange={(e) => setPriceNaira(e.target.value)}
              className="tm-input"
            />
          </label>
          <label className="mt-6 flex items-center gap-2">
            <input type="checkbox" checked={negotiable} onChange={(e) => setNegotiable(e.target.checked)} />
            <span className="text-sm text-tm-dark/80">Negotiable</span>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-tm-dark/80">City</span>
            <input value={city} onChange={(e) => setCity(e.target.value)} className="tm-input" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-tm-dark/80">State</span>
            <input value={state} onChange={(e) => setState(e.target.value)} className="tm-input" />
          </label>
        </div>

        {attributes.length > 0 && (
          <div className="space-y-4 border-t border-tm-navy/10 pt-5">
            <h2 className="text-sm font-semibold text-tm-navy">Category details</h2>
            {attributes.map((ca) => (
              <label key={ca.attribute.id} className="block">
                <span className="mb-1 block text-sm font-medium text-tm-dark/80">
                  {ca.attribute.label} {ca.required && <span className="text-red-600">*</span>}
                </span>
                <input
                  type={ca.attribute.dataType === "NUMBER" ? "number" : "text"}
                  value={attributeValues[ca.attribute.id] ?? ""}
                  onChange={(e) => setAttributeValues((prev) => ({ ...prev, [ca.attribute.id]: e.target.value }))}
                  className="tm-input"
                />
              </label>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={submitting} className="tm-btn-primary w-full">
          {submitting ? "Creating…" : "Create Listing (Draft)"}
        </button>
      </form>
    </main>
  );
}

export default function NewListingPage() {
  return (
    <RequireAuth>
      <NewListingForm />
    </RequireAuth>
  );
}
