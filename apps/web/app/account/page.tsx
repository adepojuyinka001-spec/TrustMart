"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";
import { RequireAuth } from "../../components/RequireAuth";
import { Topbar } from "../../components/Topbar";

interface ReferralInfo {
  referralCode: string;
  referredBy: "USER" | "COMPANY" | null;
  peopleReferred: number;
}

function Account() {
  const { user, token } = useAuth();
  const [referral, setReferral] = useState<ReferralInfo | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.get<ReferralInfo>("/referrals/mine", token).then(setReferral).catch(() => {});
  }, [token]);

  const referralLink =
    referral && typeof window !== "undefined" ? `${window.location.origin}/register?ref=${referral.referralCode}` : "";

  return (
    <>
      <Topbar title="My Account" />
      <main className="mx-auto max-w-2xl flex-1 p-6">
      <div className="tm-card">
        <p className="text-sm text-tm-dark/60">Name</p>
        <p className="font-medium text-tm-dark">
          {user?.profile?.firstName} {user?.profile?.lastName}
        </p>
        <p className="mt-3 text-sm text-tm-dark/60">Email</p>
        <p className="font-medium text-tm-dark">{user?.email}</p>
      </div>

      {referral && (
        <div className="tm-card mt-4">
          <h2 className="text-sm font-semibold text-tm-navy">Referral</h2>
          <p className="mt-2 text-sm text-tm-dark/70">Your referral code</p>
          <div className="mt-1 flex items-center gap-3">
            <code className="rounded bg-tm-navy/5 px-3 py-1.5 font-mono text-lg tracking-wider text-tm-navy">
              {referral.referralCode}
            </code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(referralLink);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="tm-btn-outline"
            >
              {copied ? "Copied!" : "Copy invite link"}
            </button>
          </div>
          <p className="mt-4 text-sm text-tm-dark/70">
            People you've referred: <span className="font-semibold text-tm-dark">{referral.peopleReferred}</span>
          </p>
          <p className="mt-1 text-sm text-tm-dark/70">
            You were referred by: <span className="font-semibold text-tm-dark">{referral.referredBy === "USER" ? "another TrustMart user" : "TrustMart"}</span>
          </p>
        </div>
      )}
      </main>
    </>
  );
}

export default function AccountPage() {
  return (
    <RequireAuth>
      <Account />
    </RequireAuth>
  );
}
