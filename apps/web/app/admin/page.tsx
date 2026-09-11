"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api";
import type { AnalyticsOverview } from "../../lib/types";
import { useAuth } from "../../lib/auth-context";
import { Topbar } from "../../components/Topbar";
import { StatCard } from "../../components/StatCard";
import {
  ArrowRightIcon,
  BoxIcon,
  CheckCircleIcon,
  ClipboardIcon,
  GiftIcon,
  SettingsIcon,
  ShieldIcon,
  ShopIcon,
  SlidersIcon,
  StarIcon,
  TagIcon,
  UserCircleIcon,
  UsersIcon,
} from "../../components/icons";

// Every control panel this Admin role can reach (CLAUDE.md SS25 Admin Control Centre).
// Each card is independently permission-gated on the client for display only — the API
// enforces the real authorization on every request, same convention as the Sidebar.
const CONTROL_PANELS: Array<{
  href: string;
  label: string;
  description: string;
  permission: string;
  icon: (p: { className?: string }) => JSX.Element;
}> = [
  {
    href: "/admin/users",
    label: "Users",
    description: "Manage accounts, suspend/reactivate, and assign roles.",
    permission: "user:manage",
    icon: UserCircleIcon,
  },
  {
    href: "/admin/listings",
    label: "Listing Moderation",
    description: "Approve, reject, and manage the seller inventory pipeline.",
    permission: "listing:moderate",
    icon: ShopIcon,
  },
  {
    href: "/admin/leads",
    label: "Lead Moderation",
    description: "Review flagged leads and resolve spam/fraud reports.",
    permission: "lead:moderate",
    icon: UsersIcon,
  },
  {
    href: "/admin/verification",
    label: "Verification / KYC",
    description: "Review identity and business verification cases.",
    permission: "verification:review",
    icon: CheckCircleIcon,
  },
  {
    href: "/admin/categories",
    label: "Categories & Attributes",
    description: "Manage the Category → Subcategory → Attribute engine.",
    permission: "category:manage",
    icon: TagIcon,
  },
  {
    href: "/admin/matching",
    label: "Matching Weights",
    description: "Adjust deterministic matching criteria per subcategory.",
    permission: "matching:manage",
    icon: SlidersIcon,
  },
  {
    href: "/admin/subscriptions",
    label: "Subscription Plans",
    description: "Configure seller plans, pricing, and entitlements.",
    permission: "subscription:manage",
    icon: StarIcon,
  },
  {
    href: "/admin/config",
    label: "Platform Configuration",
    description: "Versioned platform-wide settings (thresholds, fees, durations).",
    permission: "platform_config:read",
    icon: SettingsIcon,
  },
  {
    href: "/admin/analytics",
    label: "Analytics",
    description: "Read-only overview of Marketplace and Escrow activity.",
    permission: "analytics:read",
    icon: BoxIcon,
  },
  {
    href: "/admin/audit",
    label: "Audit Log",
    description: "Append-only trail of every sensitive action on the platform.",
    permission: "audit:read",
    icon: ClipboardIcon,
  },
];

function SuperAdminDashboard() {
  const { user, token } = useAuth();
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);

  useEffect(() => {
    if (user?.permissions?.includes("analytics:read")) {
      api.get<AnalyticsOverview>("/admin/analytics/overview", token).then(setOverview).catch(() => {});
    }
  }, [token, user]);

  const visiblePanels = CONTROL_PANELS.filter((panel) => user?.permissions?.includes(panel.permission));

  return (
    <>
      <Topbar title="Super Admin — Control Centre" subtitle="Everything happening on TrustMart, one place to manage it" />
      <main className="flex-1 space-y-6 bg-tm-navy/[0.02] p-6">
        <div className="tm-card flex items-center gap-3 border-l-4 border-l-tm-gold">
          <ShieldIcon className="h-6 w-6 shrink-0 text-tm-navy" />
          <div>
            <p className="text-sm font-semibold text-tm-navy">
              Signed in as an Administrator with {user?.permissions?.length ?? 0} platform permission
              {user?.permissions?.length === 1 ? "" : "s"}.
            </p>
            <p className="text-xs text-tm-dark/60">
              Every action below still goes through server-side authorization — nothing here bypasses the guarded
              domain services (CLAUDE.md SS25).
            </p>
          </div>
        </div>

        {overview && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={<UsersIcon className="h-5 w-5" />} label="Total Users" value={overview.users.total} tone="navy" />
            <StatCard
              icon={<ClipboardIcon className="h-5 w-5" />}
              label="Interests"
              value={overview.interests.total}
              tone="gold"
            />
            <StatCard
              icon={<ShieldIcon className="h-5 w-5" />}
              label="Match Qualification Rate"
              value={overview.matching.qualificationRate !== null ? `${overview.matching.qualificationRate}%` : "—"}
              tone="purple"
            />
            <StatCard
              icon={<GiftIcon className="h-5 w-5" />}
              label="Active Subscription Plans"
              value={overview.subscriptions.activePlans}
              tone="green"
            />
          </div>
        )}

        <div>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-tm-dark/50">Control Panels</h2>
          {visiblePanels.length === 0 ? (
            <div className="tm-card">
              <p className="text-sm text-tm-dark/60">
                Your account doesn&apos;t hold any admin permissions yet. Ask an existing Administrator to grant a
                role.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visiblePanels.map((panel) => {
                const PanelIcon = panel.icon;
                return (
                  <Link
                    key={panel.href}
                    href={panel.href}
                    className="tm-card group flex flex-col gap-3 transition hover:border-tm-gold hover:shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-tm-navy/10 text-tm-navy">
                        <PanelIcon className="h-5 w-5" />
                      </span>
                      <ArrowRightIcon className="h-4 w-4 text-tm-dark/30 transition group-hover:translate-x-0.5 group-hover:text-tm-gold" />
                    </div>
                    <div>
                      <p className="font-semibold text-tm-navy">{panel.label}</p>
                      <p className="mt-1 text-xs leading-snug text-tm-dark/60">{panel.description}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

export default function SuperAdminDashboardPage() {
  // Deliberately not gated behind a single RequirePermission (unlike every other /admin/*
  // page) — this hub is reachable by any account with at least one admin permission, and
  // simply shows fewer panels for narrower roles. It never renders privileged data itself;
  // the numbers come from the already permission-gated /admin/analytics/overview call.
  const { user, loading } = useAuth();

  if (loading || !user) {
    return <main className="mx-auto max-w-2xl px-6 py-10 text-sm text-tm-dark/60">Loading…</main>;
  }

  const hasAnyAdminAccess = CONTROL_PANELS.some((panel) => user.permissions?.includes(panel.permission));
  if (!hasAnyAdminAccess) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-10">
        <div className="tm-card">
          <h1 className="text-lg font-bold text-tm-navy">Access restricted</h1>
          <p className="mt-2 text-sm text-tm-dark/60">Your account doesn&apos;t have access to the Admin Control Centre.</p>
        </div>
      </main>
    );
  }

  return <SuperAdminDashboard />;
}
