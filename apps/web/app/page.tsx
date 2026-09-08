"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth-context";
import { Topbar } from "../components/Topbar";
import { api } from "../lib/api";
import type { Category, Listing } from "../lib/types";
import {
  ArrowRightIcon,
  BoxIcon,
  CheckCircleIcon,
  HeadsetIcon,
  LockIcon,
  SearchIcon,
  ShieldIcon,
  ShopIcon,
  UsersIcon,
} from "../components/icons";

// Icon per top-level category key. Falls back to BoxIcon for anything not yet mapped —
// the Category Engine (CLAUDE.md SS6) is open-ended, so this list will always be partial.
const CATEGORY_ICONS: Record<string, (p: { className?: string }) => JSX.Element> = {
  "real-estate": ShieldIcon,
  vehicles: BoxIcon,
};

const HOW_IT_WORKS = [
  {
    icon: SearchIcon,
    title: "1. Find",
    body: "Search thousands of listings from trusted sellers and serious buyers.",
  },
  {
    icon: UsersIcon,
    title: "2. Connect",
    body: "Chat, negotiate and agree on the deal terms directly on TrustMart.",
  },
  {
    icon: LockIcon,
    title: "3. Secure (Optional)",
    body: "Use TrustMart Escrow for payment protection when you're ready.",
  },
  {
    icon: CheckCircleIcon,
    title: "4. Transact",
    body: "Complete the transaction with confidence.",
  },
];

export default function HomePage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [listingCount, setListingCount] = useState<number | null>(null);

  useEffect(() => {
    api
      .get<Category[]>("/categories")
      .then(setCategories)
      .catch(() => setCategories([]));
    api
      .get<Listing[]>("/listings")
      .then((listings) => setListingCount(listings.length))
      .catch(() => setListingCount(null));
  }, []);

  return (
    <>
      <Topbar />
      <main className="flex-1 bg-tm-white">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-tm-navy via-tm-navy to-[#123a7a] text-tm-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-tm-white/70">
                Marketplace&nbsp;&nbsp;|&nbsp;&nbsp;Escrow Services
              </p>
              <h1 className="mt-4 text-4xl font-extrabold uppercase leading-tight sm:text-5xl">
                Find The Deal.
                <br />
                <span className="text-tm-gold">Secure The Transaction.</span>
              </h1>
              <p className="mt-6 max-w-md text-tm-white/80">
                Connect with serious buyers and sellers. Secure payments with TrustMart Escrow.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/listings"
                  className="inline-flex items-center gap-2 rounded-md bg-tm-gold px-5 py-3 text-sm font-semibold text-tm-dark transition hover:opacity-90"
                >
                  Explore Marketplace <ArrowRightIcon className="h-4 w-4" />
                </Link>
                <Link
                  href={user ? "/escrows" : "/register"}
                  className="inline-flex items-center gap-2 rounded-md border border-tm-white/40 bg-tm-white/5 px-5 py-3 text-sm font-semibold text-tm-white transition hover:bg-tm-white/10"
                >
                  Use Escrow <ArrowRightIcon className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-4">
                {[
                  { icon: ShieldIcon, label: "Trusted Transactions" },
                  { icon: UsersIcon, label: "Verified Users" },
                  { icon: LockIcon, label: "Secure Payments" },
                  { icon: HeadsetIcon, label: "Dedicated Support" },
                ].map(({ icon: FeatureIcon, label }) => (
                  <div key={label} className="flex items-center gap-2">
                    <FeatureIcon className="h-6 w-6 shrink-0 text-tm-gold" />
                    <span className="text-xs font-medium text-tm-white/80">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Illustrative panel standing in for the brand mockup's phone photography */}
            <div className="relative mx-auto flex w-full max-w-sm items-center justify-center py-6">
              <div className="absolute h-72 w-72 rounded-full bg-tm-gold/10 blur-3xl" />
              <div className="relative flex flex-col items-center gap-6 rounded-3xl border border-tm-white/15 bg-tm-white/5 p-10 backdrop-blur-sm">
                <Image src="/tm-icon.png" alt="TrustMart" width={120} height={120} className="rounded-2xl shadow-2xl" />
                <div className="flex items-center gap-2 rounded-full bg-tm-white/10 px-4 py-2 text-xs font-medium text-tm-white/90">
                  <ShopIcon className="h-4 w-4 text-tm-gold" /> Find it. Buy it.
                </div>
                <div className="flex items-center gap-2 rounded-full bg-tm-white/10 px-4 py-2 text-xs font-medium text-tm-white/90">
                  <ArrowRightIcon className="h-4 w-4 text-tm-gold" /> List it. Sell it.
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-tm-white px-4 py-3 text-tm-dark shadow-xl">
                  <LockIcon className="h-8 w-8 rounded-lg bg-tm-navy p-1.5 text-tm-white" />
                  <div className="text-left">
                    <p className="text-sm font-bold leading-tight">Secure it.</p>
                    <p className="text-xs leading-tight text-tm-dark/60">With TrustMart Escrow.</p>
                  </div>
                  <CheckCircleIcon className="h-6 w-6 text-emerald-500" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats strip — real platform figures only, no fabricated marketing numbers */}
        <section className="mx-auto -mt-8 max-w-6xl px-6">
          <div className="grid grid-cols-2 gap-6 rounded-xl border border-tm-navy/10 bg-tm-white px-6 py-6 shadow-lg sm:grid-cols-4">
            <div className="flex items-center gap-3">
              <BoxIcon className="h-8 w-8 shrink-0 text-tm-navy" />
              <div>
                <p className="text-xl font-extrabold text-tm-navy">{listingCount ?? "—"}</p>
                <p className="text-xs text-tm-dark/60">Active Listings</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ShieldIcon className="h-8 w-8 shrink-0 text-tm-navy" />
              <div>
                <p className="text-xl font-extrabold text-tm-navy">{categories.length || "—"}</p>
                <p className="text-xs text-tm-dark/60">Categories</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <LockIcon className="h-8 w-8 shrink-0 text-tm-navy" />
              <div>
                <p className="text-xl font-extrabold text-tm-navy">Optional</p>
                <p className="text-xs text-tm-dark/60">Escrow Protection</p>
              </div>
            </div>
            <div className="hidden items-center justify-end sm:flex">
              <p className="font-serif text-lg italic text-tm-navy/70">Find. Secure. Transact.</p>
            </div>
          </div>
        </section>

        {/* How TrustMart Works */}
        <section className="mx-auto max-w-6xl px-6 py-20 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-tm-navy/60">How TrustMart Works</p>
          <h2 className="mt-2 text-3xl font-extrabold text-tm-navy">Simple. Safe. Effective.</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-tm-dark/60">
            From finding opportunities to securing payments, TrustMart makes it easy.
          </p>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map(({ icon: StepIcon, title, body }) => (
              <div key={title} className="tm-card text-left">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-tm-navy/5">
                  <StepIcon className="h-6 w-6 text-tm-navy" />
                </div>
                <h3 className="font-bold text-tm-navy">{title}</h3>
                <p className="mt-2 text-sm text-tm-dark/60">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Explore Top Categories */}
        <section className="bg-tm-navy/[0.03] py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-tm-navy/60">Popular Categories</p>
                <h2 className="mt-2 text-3xl font-extrabold text-tm-navy">Explore Top Categories</h2>
              </div>
              <Link href="/listings" className="hidden items-center gap-1 text-sm font-semibold text-tm-navy hover:text-tm-gold sm:flex">
                View All Categories <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {categories.length === 0 && (
                <p className="col-span-full text-sm text-tm-dark/50">Categories are being configured — check back soon.</p>
              )}
              {categories.map((category) => {
                const CategoryIcon = CATEGORY_ICONS[category.key] ?? BoxIcon;
                const firstSub = category.subcategories?.[0];
                return (
                  <Link
                    key={category.id}
                    href={firstSub ? `/listings?subcategoryId=${firstSub.id}` : "/listings"}
                    className="tm-card flex flex-col items-center gap-3 text-center transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-tm-navy/5">
                      <CategoryIcon className="h-7 w-7 text-tm-navy" />
                    </div>
                    <div>
                      <p className="font-semibold text-tm-navy">{category.label}</p>
                      <p className="mt-0.5 text-xs text-tm-dark/50">
                        {category.subcategories?.map((s) => s.label).join(", ") || "Browse listings"}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-6 rounded-2xl bg-tm-navy px-8 py-12 text-tm-white sm:grid-cols-2 sm:items-center">
            <div>
              <h2 className="text-2xl font-extrabold">TrustMart Marketplace</h2>
              <p className="mt-2 text-sm text-tm-white/70">
                Browse active listings, submit buyer requests, and get deterministically matched.
              </p>
              <Link href="/listings" className="tm-btn-gold mt-5 inline-block">
                Browse Listings
              </Link>
            </div>
            <div>
              <h2 className="text-2xl font-extrabold">TrustMart Escrow</h2>
              <p className="mt-2 text-sm text-tm-white/70">
                Once you&apos;ve connected with a buyer or seller, secure the deal — funds and terms
                held to versioned, mutually accepted terms.
              </p>
              <Link
                href={user ? "/escrows" : "/register"}
                className="mt-5 inline-block rounded-md border border-tm-white/40 px-4 py-2 text-sm font-semibold text-tm-white transition hover:bg-tm-white/10"
              >
                Secure This Deal With TrustMart Escrow
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
