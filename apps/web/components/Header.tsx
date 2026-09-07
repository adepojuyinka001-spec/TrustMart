"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth-context";

const NAV_LINKS = [
  { href: "/listings", label: "Marketplace" },
  { href: "/buyer-requests", label: "Buyer Requests" },
  { href: "/leads", label: "Leads" },
  { href: "/escrows", label: "Escrow" },
];

export function Header() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();

  return (
    <header className="border-b border-tm-navy/10 bg-tm-navy px-6 py-4 text-tm-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
        <Link href="/" className="text-xl font-bold tracking-wide">
          TRUST<span className="text-tm-gold">MART</span>
        </Link>

        <nav className="flex flex-wrap items-center gap-5 text-sm font-medium">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="text-tm-white/85 transition hover:text-tm-gold">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 text-sm">
          {loading ? null : user ? (
            <>
              <Link href="/account" className="text-tm-white/85 transition hover:text-tm-gold">
                {user.profile?.firstName ?? user.email}
              </Link>
              <button
                type="button"
                onClick={() => {
                  logout();
                  router.push("/");
                }}
                className="rounded-md border border-tm-white/30 px-3 py-1.5 font-semibold transition hover:border-tm-gold hover:text-tm-gold"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-tm-white/85 transition hover:text-tm-gold">
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-tm-gold px-3 py-1.5 font-semibold text-tm-dark transition hover:opacity-90"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
