"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "../lib/auth-context";
import { Topbar } from "../components/Topbar";

export default function HomePage() {
  const { user } = useAuth();

  return (
    <>
      <Topbar />
      <main className="flex-1 bg-tm-white">
        <section className="mx-auto max-w-5xl px-6 py-16">
          <div className="flex items-center gap-4">
            <Image src="/tm-icon.png" alt="TrustMart" width={56} height={56} className="rounded-xl" />
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-tm-gold">
                Securing Transactions. Building Trust.
              </p>
              <h1 className="text-3xl font-bold text-tm-navy sm:text-5xl">Find. Secure. Transact.</h1>
            </div>
          </div>
          <p className="mt-6 max-w-2xl text-tm-dark/80">
            TrustMart Marketplace connects buyers and sellers. TrustMart Escrow secures eligible
            deals from anywhere — Marketplace, WhatsApp, social media, or a direct offline
            agreement. Neither requires the other.
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            <article className="tm-card">
              <h2 className="text-lg font-semibold text-tm-navy">TrustMart Marketplace</h2>
              <p className="mt-2 text-sm text-tm-dark/70">
                Browse active listings, submit buyer requests, and get deterministically matched.
              </p>
              <Link href="/listings" className="tm-btn-primary mt-4 inline-block">
                Browse Listings
              </Link>
            </article>
            <article className="tm-card">
              <h2 className="text-lg font-semibold text-tm-navy">TrustMart Escrow</h2>
              <p className="mt-2 text-sm text-tm-dark/70">
                Once you've connected with a buyer or seller, secure the deal — funds and terms
                held to versioned, mutually accepted terms.
              </p>
              <Link href={user ? "/escrows" : "/register"} className="tm-btn-gold mt-4 inline-block">
                Secure This Deal With TrustMart Escrow
              </Link>
            </article>
          </div>
        </section>
      </main>
    </>
  );
}
