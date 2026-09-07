import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-tm-white text-tm-dark">
      <section className="mx-auto max-w-5xl px-6 py-16">
        <p className="text-sm font-semibold uppercase tracking-widest text-tm-gold">
          Securing Transactions. Building Trust.
        </p>
        <h1 className="mt-3 text-3xl font-bold text-tm-navy sm:text-5xl">Find. Secure. Transact.</h1>
        <p className="mt-4 max-w-2xl text-tm-dark/80">
          TrustMart Marketplace connects buyers and sellers. TrustMart Escrow secures eligible
          deals from anywhere — Marketplace, WhatsApp, social media, or a direct offline
          agreement. Neither requires the other.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <article className="rounded-lg border border-tm-navy/10 p-6">
            <h2 className="text-lg font-semibold text-tm-navy">TrustMart Marketplace</h2>
            <p className="mt-2 text-sm text-tm-dark/70">
              Browse active listings, submit buyer requests, and get deterministically matched.
            </p>
            <Link
              href="/listings"
              className="mt-4 inline-block rounded-md bg-tm-navy px-4 py-2 text-sm font-semibold text-tm-white transition hover:opacity-90"
            >
              Browse Listings
            </Link>
          </article>
          <article className="rounded-lg border border-tm-navy/10 p-6">
            <h2 className="text-lg font-semibold text-tm-navy">TrustMart Escrow</h2>
            <p className="mt-2 text-sm text-tm-dark/70">
              Once you've connected with a buyer or seller, secure the deal — funds and terms
              held to versioned, mutually accepted terms.
            </p>
            <Link
              href="/escrows"
              className="mt-4 inline-block rounded-md bg-tm-gold px-4 py-2 text-sm font-semibold text-tm-dark transition hover:opacity-90"
            >
              Secure This Deal With TrustMart Escrow
            </Link>
          </article>
        </div>
      </section>
    </main>
  );
}
