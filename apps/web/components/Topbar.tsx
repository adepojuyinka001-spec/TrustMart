"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAuth } from "../lib/auth-context";
import { useMobileNav } from "../lib/mobile-nav-context";
import { HomeIcon, MenuIcon, SearchIcon, ShieldIcon, ShopIcon, UserCircleIcon } from "./icons";
import { NotificationBell } from "./NotificationBell";

const PUBLIC_NAV = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/listings", label: "Marketplace", icon: ShopIcon },
  { href: "/escrows", label: "Escrow", icon: ShieldIcon },
];

export function Topbar({ title, subtitle }: { title?: string; subtitle?: string }) {
  const { user, loading } = useAuth();
  const { toggle } = useMobileNav();
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    router.push(query.trim() ? `/listings?q=${encodeURIComponent(query.trim())}` : "/listings");
  }

  return (
    <header className="border-b border-tm-navy/10 bg-tm-white">
      <div className="flex flex-wrap items-center gap-4 px-4 py-3 sm:px-6">
        {user ? (
          <button type="button" onClick={toggle} aria-label="Open menu" className="text-tm-navy lg:hidden">
            <MenuIcon className="h-6 w-6" />
          </button>
        ) : (
          <Link href="/" className="flex items-center gap-2">
            <Image src="/tm-icon.png" alt="TrustMart" width={30} height={30} className="rounded-md" />
            <span className="font-extrabold text-tm-navy">
              TRUST<span className="text-tm-gold">MART</span>
            </span>
          </Link>
        )}

        {/* Primary nav — signed-out visitors only; signed-in users navigate via Sidebar. */}
        {!loading && !user && (
          <nav className="hidden items-center gap-6 lg:flex">
            {PUBLIC_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-1.5 text-sm font-medium text-tm-dark/70 transition hover:text-tm-navy"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        {(title || subtitle) && (
          <div className="mr-auto hidden sm:block">
            {title && <h1 className="text-lg font-bold text-tm-navy">{title}</h1>}
            {subtitle && <p className="text-xs text-tm-dark/60">{subtitle}</p>}
          </div>
        )}

        <form onSubmit={handleSearch} className="order-last w-full flex-1 sm:order-none sm:w-auto sm:max-w-sm">
          <div className="flex items-center gap-2 rounded-md border border-tm-navy/15 bg-tm-navy/[0.03] px-3 py-2">
            <SearchIcon className="h-4 w-4 shrink-0 text-tm-dark/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search listings…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-tm-dark/40"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-3 sm:ml-0">
          {loading ? null : user ? (
            <>
              <NotificationBell />
              <Link href="/account" className="flex items-center gap-2">
                <span className="hidden text-right leading-tight sm:block">
                  <span className="block text-sm font-semibold text-tm-dark">{user.profile?.firstName ?? user.email}</span>
                  <span className="block text-xs text-tm-dark/50">TrustMart Member</span>
                </span>
                <UserCircleIcon className="h-9 w-9 text-tm-navy" />
              </Link>
            </>
          ) : (
            <>
              {/* Secondary CTA */}
              <Link href="/login" className="text-sm font-medium text-tm-navy hover:text-tm-gold">
                Log in
              </Link>
              {/* Primary CTA — the conversion action this header exists to drive. */}
              <Link href="/register" className="tm-btn-gold">
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
