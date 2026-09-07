"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth-context";

// Client-side gate only — a nicety so logged-out users get redirected instead of seeing
// a broken form. The API is the real authorization boundary (CLAUDE.md SS28); this
// component enforces nothing on its own.
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return <main className="mx-auto max-w-2xl px-6 py-10 text-sm text-tm-dark/60">Loading…</main>;
  }

  return <>{children}</>;
}
