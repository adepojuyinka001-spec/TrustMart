"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth, isApiError } from "../../lib/auth-context";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [referralCode, setReferralCode] = useState(searchParams.get("ref") ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register({ email, password, firstName, lastName, referralCode: referralCode || undefined });
      router.push("/listings");
    } catch (err) {
      setError(isApiError(err) ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-bold text-tm-navy">Create your TrustMart account</h1>
      <p className="mt-2 text-sm text-tm-dark/70">Find. Secure. Transact.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="First name">
            <input
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="tm-input"
            />
          </Field>
          <Field label="Last name">
            <input required value={lastName} onChange={(e) => setLastName(e.target.value)} className="tm-input" />
          </Field>
        </div>

        <Field label="Email">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="tm-input"
          />
        </Field>

        <Field label="Password">
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="tm-input"
          />
        </Field>

        <Field label="Referral code (optional)">
          <input
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value)}
            placeholder="e.g. AB3D9F2K"
            className="tm-input"
          />
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-tm-navy px-4 py-2.5 text-sm font-semibold text-tm-white transition hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-sm text-tm-dark/70">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-tm-navy hover:text-tm-gold">
          Log in
        </Link>
      </p>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-tm-dark/80">{label}</span>
      {children}
    </label>
  );
}
