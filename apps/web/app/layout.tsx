import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "TrustMart — Securing Transactions. Building Trust.",
  description:
    "TrustMart is a Trust & Commerce Network: a marketplace for buyers and sellers, backed by optional TrustMart Escrow transaction assurance.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={montserrat.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
