"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Client-side password validation feedback
  const rules = [
    { label: "At least 8 characters", ok: password.length >= 8 },
    { label: "One uppercase letter", ok: /[A-Z]/.test(password) },
    { label: "One lowercase letter", ok: /[a-z]/.test(password) },
    { label: "One number", ok: /[0-9]/.test(password) },
    { label: "One special character", ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const allRulesMet = rules.every((r) => r.ok);
  const passwordsMatch = password === confirm && confirm.length > 0;

  if (!token) {
    return (
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-md text-center">
        <h1 className="mb-2 text-xl font-bold text-gray-900">Invalid reset link</h1>
        <p className="mb-6 text-sm text-gray-600">
          This reset link is missing a token. Please request a new one.
        </p>
        <Link
          href="/auth/forgot-password"
          className="inline-block rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Request new link
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!allRulesMet || !passwordsMatch) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = (await res.json()) as { message?: string; error?: string };

      if (res.ok) {
        router.push("/auth/login?reset=true");
      } else {
        setError(data.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-md">
      <h1 className="mb-1 text-2xl font-bold text-gray-900">Set new password</h1>
      <p className="mb-6 text-sm text-gray-500">Choose a strong password for your account.</p>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            New password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            placeholder="••••••••"
          />
          {/* Password strength rules */}
          {password.length > 0 && (
            <ul className="mt-2 space-y-1">
              {rules.map((rule) => (
                <li
                  key={rule.label}
                  className={`flex items-center gap-1.5 text-xs ${rule.ok ? "text-green-600" : "text-gray-400"}`}
                >
                  <span aria-hidden="true">{rule.ok ? "✓" : "○"}</span>
                  {rule.label}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1">
            Confirm new password
          </label>
          <input
            id="confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={isLoading}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            placeholder="••••••••"
          />
          {confirm.length > 0 && !passwordsMatch && (
            <p className="mt-1 text-xs text-red-500">Passwords do not match.</p>
          )}
        </div>

        {error && (
          <div
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            role="alert"
          >
            {error}
            {error.toLowerCase().includes("expired") && (
              <span>
                {" "}
                <Link href="/auth/forgot-password" className="font-medium underline">
                  Request a new link.
                </Link>
              </span>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !allRulesMet || !passwordsMatch}
          className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
        >
          {isLoading ? "Saving…" : "Set new password"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Suspense
        fallback={
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-md text-center text-sm text-gray-500">
            Loading…
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
