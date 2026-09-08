"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth-context";

// Client-side gate only — same nicety as RequireAuth, so a user without the permission
// sees a clear message instead of an admin page silently 403ing on every fetch. The API
// is the real authorization boundary (CLAUDE.md SS28/SS32); this enforces nothing on its
// own, and `user.permissions` is only ever a UX convenience (see users.service.ts).
export function RequirePermission({ permission, children }: { permission: string; children: React.ReactNode }) {
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

  if (!user.permissions?.includes(permission)) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-10">
        <div className="tm-card">
          <h1 className="text-lg font-bold text-tm-navy">Access restricted</h1>
          <p className="mt-2 text-sm text-tm-dark/60">
            Your account doesn&apos;t have access to this Admin area.
          </p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
