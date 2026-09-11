"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "../lib/auth-context";
import { useMobileNav } from "../lib/mobile-nav-context";
import {
  BoxIcon,
  CheckCircleIcon,
  ClipboardIcon,
  LogoutIcon,
  GaugeIcon,
  HeartIcon,
  HomeIcon,
  PlusIcon,
  SettingsIcon,
  ShieldIcon,
  ShopIcon,
  SlidersIcon,
  StarIcon,
  TagIcon,
  UserCircleIcon,
  UsersIcon,
} from "./icons";

const NAV_SECTIONS: Array<{
  label: string;
  items: Array<{ href: string; label: string; icon: (p: { className?: string }) => JSX.Element }>;
}> = [
  {
    label: "",
    items: [{ href: "/dashboard", label: "Dashboard", icon: HomeIcon }],
  },
  {
    label: "Marketplace",
    items: [
      { href: "/listings", label: "Browse Listings", icon: ShopIcon },
      { href: "/buyer-requests", label: "My Requests", icon: ClipboardIcon },
      { href: "/listings/mine", label: "My Listings", icon: TagIcon },
      { href: "/saved", label: "Saved", icon: HeartIcon },
      { href: "/leads", label: "Leads", icon: UsersIcon },
    ],
  },
  {
    label: "Escrow",
    items: [{ href: "/escrows", label: "My Escrows", icon: ShieldIcon }],
  },
];

// Shown only to accounts with the matching permission (checked below, not here — this
// list just needs to exist so its hrefs participate in active-link matching).
const ADMIN_SECTION: {
  label: string;
  items: Array<{ href: string; label: string; icon: (p: { className?: string }) => JSX.Element; permission: string }>;
} = {
  label: "Admin",
  items: [
    { href: "/admin/analytics", label: "Analytics", icon: BoxIcon, permission: "analytics:read" },
    { href: "/admin/audit", label: "Audit Log", icon: ClipboardIcon, permission: "audit:read" },
    { href: "/admin/categories", label: "Categories", icon: TagIcon, permission: "category:manage" },
    { href: "/admin/listings", label: "Listing Moderation", icon: ShopIcon, permission: "listing:moderate" },
    { href: "/admin/leads", label: "Lead Moderation", icon: UsersIcon, permission: "lead:moderate" },
    { href: "/admin/config", label: "Platform Config", icon: SettingsIcon, permission: "platform_config:read" },
    { href: "/admin/subscriptions", label: "Subscription Plans", icon: StarIcon, permission: "subscription:manage" },
    { href: "/admin/verification", label: "Verification", icon: CheckCircleIcon, permission: "verification:review" },
    { href: "/admin/matching", label: "Matching Weights", icon: SlidersIcon, permission: "matching:manage" },
  ],
};

const ALL_HREFS = [
  ...NAV_SECTIONS.flatMap((s) => s.items.map((i) => i.href)),
  "/admin",
  ...ADMIN_SECTION.items.map((i) => i.href),
  "/account",
];

// Longest-matching-prefix wins, so e.g. "/listings/mine" doesn't also light up
// "/listings" (Browse Listings) just because it shares that prefix.
function isActiveHref(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (!pathname.startsWith(href + "/")) return false;
  const longestMatch = ALL_HREFS.filter((h) => pathname === h || pathname.startsWith(h + "/")).sort(
    (a, b) => b.length - a.length,
  )[0];
  return longestMatch === href;
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();

  const visibleAdminItems = ADMIN_SECTION.items.filter((item) => user?.permissions?.includes(item.permission));
  // The hub itself is reachable by ANY admin permission, not one specific one — so it
  // can't live in ADMIN_SECTION.items (which is filtered on a single permission above).
  const hasAnyAdminAccess = visibleAdminItems.length > 0;

  return (
    <>
      <div className="flex items-center gap-2.5 border-b border-white/10 px-5 py-5">
        <Image src="/tm-icon.png" alt="TrustMart" width={38} height={38} className="rounded-lg" />
        <div className="leading-tight">
          <p className="text-base font-extrabold tracking-wide">
            TRUST<span className="text-tm-gold">MART</span>
          </p>
          <p className="text-[9px] font-semibold uppercase tracking-widest text-tm-white/50">Marketplace | Escrow</p>
        </div>
      </div>

      <div className="px-4 pt-4">
        <Link
          href="/listings/new"
          onClick={onNavigate}
          className="flex w-full items-center justify-center gap-1.5 rounded-md bg-tm-gold px-3 py-2.5 text-sm font-semibold text-tm-dark transition hover:opacity-90"
        >
          <PlusIcon className="h-4 w-4" />
          Post a Listing
        </Link>
      </div>

      <nav className="mt-4 flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label || "root"}>
            {section.label && (
              <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-widest text-tm-white/40">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActiveHref(pathname, item.href);
                const ItemIcon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
                      active ? "bg-tm-gold text-tm-dark" : "text-tm-white/80 hover:bg-white/5 hover:text-tm-white"
                    }`}
                  >
                    <ItemIcon className="h-[18px] w-[18px] shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {hasAnyAdminAccess && (
          <div>
            <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-widest text-tm-white/40">
              {ADMIN_SECTION.label}
            </p>
            <div className="space-y-0.5">
              <Link
                href="/admin"
                onClick={onNavigate}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
                  pathname === "/admin"
                    ? "bg-tm-gold text-tm-dark"
                    : "text-tm-white/80 hover:bg-white/5 hover:text-tm-white"
                }`}
              >
                <GaugeIcon className="h-[18px] w-[18px] shrink-0" />
                Control Centre
              </Link>
              {visibleAdminItems.map((item) => {
                const active = isActiveHref(pathname, item.href);
                const ItemIcon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
                      active ? "bg-tm-gold text-tm-dark" : "text-tm-white/80 hover:bg-white/5 hover:text-tm-white"
                    }`}
                  >
                    <ItemIcon className="h-[18px] w-[18px] shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-widest text-tm-white/40">Account</p>
          <Link
            href="/account"
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
              pathname === "/account" ? "bg-tm-gold text-tm-dark" : "text-tm-white/80 hover:bg-white/5 hover:text-tm-white"
            }`}
          >
            <UserCircleIcon className="h-[18px] w-[18px] shrink-0" />
            Referral &amp; Profile
          </Link>
        </div>
      </nav>

      <div className="space-y-3 border-t border-white/10 p-4">
        <div className="rounded-lg border border-tm-gold/30 bg-white/5 p-3.5">
          <div className="flex items-center gap-2 text-tm-gold">
            <ShieldIcon className="h-5 w-5" />
            <p className="text-xs font-bold uppercase tracking-wide">Secure by design</p>
          </div>
          <p className="mt-1.5 text-xs leading-snug text-tm-white/70">
            TrustMart Escrow protects both buyers and sellers until every term is met.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            logout();
            router.push("/");
          }}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-tm-white/70 transition hover:bg-white/5 hover:text-tm-white"
        >
          <LogoutIcon className="h-[18px] w-[18px]" />
          Log out
        </button>
      </div>
    </>
  );
}

export function Sidebar() {
  const { user } = useAuth();
  const { isOpen, close } = useMobileNav();
  const pathname = usePathname();

  // Close the mobile drawer automatically whenever the route changes.
  useEffect(() => {
    close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!user) return null;

  return (
    <>
      <aside className="hidden w-64 shrink-0 flex-col bg-tm-navy text-tm-white lg:flex">
        <SidebarContent />
      </aside>

      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={close}
            className="absolute inset-0 bg-black/50"
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-tm-navy text-tm-white shadow-xl">
            <SidebarContent onNavigate={close} />
          </aside>
        </div>
      )}
    </>
  );
}
