"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth, isApiError } from "../../lib/auth-context";
import { PasswordInput } from "../../components/PasswordInput";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(isApiError(err) ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <div className="mb-6 flex justify-center">
        <Image src="/tm-icon.png" alt="TrustMart" width={56} height={56} className="rounded-xl" />
      </div>
      <h1 className="text-center text-2xl font-bold text-tm-navy">Log in to TrustMart</h1>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-tm-dark/80">Email</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="tm-input" />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-tm-dark/80">Password</span>
          <PasswordInput value={password} onChange={setPassword} required autoComplete="current-password" />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={submitting} className="tm-btn-primary w-full">
          {submitting ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className="mt-6 text-sm text-tm-dark/70">
        New to TrustMart?{" "}
        <Link href="/register" className="font-semibold text-tm-navy hover:text-tm-gold">
          Create an account
        </Link>
      </p>
    </main>
  );
}
