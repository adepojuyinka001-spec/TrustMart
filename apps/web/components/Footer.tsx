import Image from "next/image";
import Link from "next/link";

const FOOTER_SECTIONS: Array<{ label: string; links: Array<{ href: string; label: string }> }> = [
  {
    label: "Marketplace",
    links: [
      { href: "/listings", label: "Browse Listings" },
      { href: "/listings/new", label: "Post a Listing" },
      { href: "/buyer-requests/new", label: "Post a Buyer Request" },
    ],
  },
  {
    label: "Escrow",
    links: [{ href: "/escrows", label: "My Escrows" }],
  },
  {
    label: "Account",
    links: [
      { href: "/login", label: "Log In" },
      { href: "/register", label: "Sign Up" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-tm-navy text-tm-white">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/tm-icon.png" alt="TrustMart" width={36} height={36} className="rounded-lg" />
              <span className="text-lg font-extrabold">
                TRUST<span className="text-tm-gold">MART</span>
              </span>
            </Link>
            <p className="mt-3 text-sm text-tm-white/70">Marketplace | Escrow</p>
            <p className="mt-4 max-w-xs text-sm text-tm-white/60">
              Securing Transactions. Building Trust. Connect with serious buyers and sellers, and secure eligible
              deals with TrustMart Escrow — on your terms.
            </p>
          </div>

          {FOOTER_SECTIONS.map((section) => (
            <div key={section.label}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-tm-white/50">{section.label}</h3>
              <ul className="mt-4 space-y-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-tm-white/80 transition hover:text-tm-gold">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-tm-white/10 pt-6 text-xs text-tm-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} TrustMart Limited. All rights reserved.</p>
          <p className="font-medium tracking-wide text-tm-white/70">Find. Secure. Transact.</p>
        </div>
      </div>
    </footer>
  );
}
