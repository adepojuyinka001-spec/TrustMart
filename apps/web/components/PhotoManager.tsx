"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { api, ApiError } from "../lib/api";
import type { ListingPhoto } from "../lib/types";
import { useAuth } from "../lib/auth-context";
import { StarIcon, TagIcon } from "./icons";

const MAX_PHOTOS = 8;

// Owner-only photo manager for a listing (CLAUDE.md SS8: listings support "media"). Every
// upload is watermarked server-side before storage — nothing this component sends is
// stored unwatermarked. At least 5 photos are supported per listing (cap: 8), and exactly
// one is the "best photo" shown on listing cards elsewhere in the app.
export function PhotoManager({ listingId, photos, onChanged }: { listingId: string; photos: ListingPhoto[]; onChanged: () => void }) {
  const { token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append("photos", file));
      await api.uploadForm(`/listings/${listingId}/media`, formData, token);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not upload photos.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function setPrimary(mediaId: string) {
    setBusyId(mediaId);
    setError(null);
    try {
      await api.patch(`/listings/${listingId}/media/${mediaId}/primary`, undefined, token);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not set as best photo.");
    } finally {
      setBusyId(null);
    }
  }

  async function removePhoto(mediaId: string) {
    setBusyId(mediaId);
    setError(null);
    try {
      await api.delete(`/listings/${listingId}/media/${mediaId}`, token);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not remove photo.");
    } finally {
      setBusyId(null);
    }
  }

  const atCap = photos.length >= MAX_PHOTOS;

  return (
    <div className="tm-card">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-tm-navy">Photos</h2>
        <span className="text-xs text-tm-dark/50">
          {photos.length}/{MAX_PHOTOS} — add at least 5 for the best results
        </span>
      </div>

      {photos.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {photos.map((photo) => (
            <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-lg border border-tm-navy/10">
              <Image src={photo.url} alt="Listing photo" fill className="object-cover" unoptimized />
              {photo.isPrimary && (
                <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-tm-gold px-2 py-0.5 text-[10px] font-semibold text-tm-dark">
                  <StarIcon className="h-3 w-3" /> Best photo
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/60 px-1.5 py-1 opacity-0 transition group-hover:opacity-100">
                {!photo.isPrimary && (
                  <button
                    type="button"
                    disabled={busyId === photo.id}
                    onClick={() => setPrimary(photo.id)}
                    className="text-[10px] font-semibold text-white hover:text-tm-gold disabled:opacity-40"
                  >
                    Set as best
                  </button>
                )}
                <button
                  type="button"
                  disabled={busyId === photo.id}
                  onClick={() => removePhoto(photo.id)}
                  className="ml-auto text-[10px] font-semibold text-white hover:text-red-400 disabled:opacity-40"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {photos.length === 0 && (
        <div className="mt-3 flex items-center gap-2 text-sm text-tm-dark/50">
          <TagIcon className="h-4 w-4" /> No photos yet.
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
      <button
        type="button"
        disabled={uploading || atCap}
        onClick={() => fileInputRef.current?.click()}
        className="tm-btn-outline mt-4 disabled:opacity-40"
      >
        {uploading ? "Uploading…" : atCap ? "Photo limit reached" : "Add Photos"}
      </button>
      <p className="mt-2 text-xs text-tm-dark/50">Every photo is automatically watermarked with the TrustMart logo.</p>
    </div>
  );
}
