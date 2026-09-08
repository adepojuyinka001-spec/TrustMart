"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAuth } from "../lib/auth-context";
import { SearchIcon, UserCircleIcon } from "./icons";

export function Topbar({ title, subtitle }: { title?: string; subtitle?: string }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    router.push(query.trim() ? `/listings?q=${encodeURIComponent(query.trim())}` : "/listings");
  }

  return (
    <header className="flex flex-wrap items-center gap-4 border-b border-tm-navy/10 bg-tm-white px-4 py-3 sm:px-6">
      {!user && (
        <Link href="/" className="flex items-center gap-2 lg:hidden">
          <Image src="/tm-icon.png" alt="TrustMart" width={30} height={30} className="rounded-md" />
          <span className="font-extrabold text-tm-navy">
            TRUST<span className="text-tm-gold">MART</span>
          </span>
        </Link>
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
          <Link href="/account" className="flex items-center gap-2">
            <span className="hidden text-right leading-tight sm:block">
              <span className="block text-sm font-semibold text-tm-dark">{user.profile?.firstName ?? user.email}</span>
              <span className="block text-xs text-tm-dark/50">TrustMart Member</span>
            </span>
            <UserCircleIcon className="h-9 w-9 text-tm-navy" />
          </Link>
        ) : (
          <>
            <Link href="/login" className="text-sm font-medium text-tm-navy hover:text-tm-gold">
              Log in
            </Link>
            <Link href="/register" className="tm-btn-gold">
              Sign up
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
