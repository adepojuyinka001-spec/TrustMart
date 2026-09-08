import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../lib/auth-context";
import { MobileNavProvider } from "../lib/mobile-nav-context";
import { Sidebar } from "../components/Sidebar";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "TrustMart — Find. Secure. Transact.",
  description:
    "TrustMart is a Trust & Commerce Network: a marketplace for buyers and sellers, backed by optional TrustMart Escrow transaction assurance.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={montserrat.variable}>
      <body className="min-h-screen bg-tm-white font-sans text-tm-dark antialiased">
        <AuthProvider>
          <MobileNavProvider>
            <div className="flex min-h-screen">
              <Sidebar />
              <div className="flex min-h-screen flex-1 flex-col">{children}</div>
            </div>
          </MobileNavProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
