export default function HomePage() {
  return (
    <main className="min-h-screen bg-tm-white text-tm-dark">
      <header className="border-b border-tm-navy/10 bg-tm-navy px-6 py-5 text-tm-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <span className="text-xl font-bold tracking-wide">
            TRUST<span className="text-tm-gold">MART</span>
          </span>
          <span className="hidden text-sm font-medium text-tm-white/80 sm:block">
            Securing Transactions. Building Trust.
          </span>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <h1 className="text-3xl font-bold text-tm-navy sm:text-4xl">
          One Trust &amp; Commerce Network. Two sibling products.
        </h1>
        <p className="mt-4 max-w-2xl text-tm-dark/80">
          TrustMart Marketplace connects buyers and sellers. TrustMart Escrow secures eligible
          deals from anywhere — Marketplace, WhatsApp, social media, or a direct offline
          agreement. Neither requires the other.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <article className="rounded-lg border border-tm-navy/10 p-6">
            <h2 className="text-lg font-semibold text-tm-navy">TrustMart Marketplace</h2>
            <p className="mt-2 text-sm text-tm-dark/70">Find the Deal. Secure the Transaction.</p>
          </article>
          <article className="rounded-lg border border-tm-navy/10 p-6">
            <h2 className="text-lg font-semibold text-tm-navy">TrustMart Escrow</h2>
            <p className="mt-2 text-sm text-tm-dark/70">We Hold. You Trust. We Deliver.</p>
            <button
              type="button"
              className="mt-4 rounded-md bg-tm-gold px-4 py-2 text-sm font-semibold text-tm-dark transition hover:opacity-90"
            >
              Secure This Deal With TrustMart Escrow
            </button>
          </article>
        </div>
      </section>
    </main>
  );
}
