"use client";

import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Live password strength rules
  const rules = [
    { label: "At least 8 characters", ok: password.length >= 8 },
    { label: "One uppercase letter", ok: /[A-Z]/.test(password) },
    { label: "One lowercase letter", ok: /[a-z]/.test(password) },
    { label: "One number", ok: /[0-9]/.test(password) },
    { label: "One special character", ok: /[^A-Za-z0-9]/.test(password) },
  ];

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setFieldErrors({});

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = (await res.json()) as {
        message?: string;
        error?: string;
        issues?: Record<string, string[]>;
      };

      if (res.ok || res.status === 200) {
        setSubmitted(true);
      } else if (res.status === 422 && data.issues) {
        setFieldErrors(data.issues);
      } else {
        setError(data.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }

  if (submitted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-md text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-6 w-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="mb-2 text-xl font-bold text-gray-900">Check your email</h1>
          <p className="mb-1 text-sm text-gray-600">
            We sent a verification link to <strong>{email}</strong>.
          </p>
          <p className="text-sm text-gray-600">
            Click the link in that email to activate your account, then you can sign in.
          </p>
          <p className="mt-4 text-xs text-gray-400">
            Didn&apos;t receive it? Check your spam folder.
          </p>
          <Link
            href="/auth/login"
            className="mt-6 inline-block text-sm text-blue-600 hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-md">
        <h1 className="mb-1 text-2xl font-bold text-gray-900">Create an account</h1>
        <p className="mb-6 text-sm text-gray-500">Join Casa Cards &amp; Collectibles</p>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Full name
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              placeholder="Your name"
            />
            {fieldErrors.name && <p className="mt-1 text-xs text-red-500">{fieldErrors.name[0]}</p>}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              placeholder="you@example.com"
            />
            {fieldErrors.email && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.email[0]}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
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
            {fieldErrors.password && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.password[0]}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 ${
                passwordsMismatch
                  ? "border-red-400"
                  : passwordsMatch
                    ? "border-green-400"
                    : "border-gray-300"
              }`}
              placeholder="••••••••"
            />
            {passwordsMismatch && (
              <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
            )}
            {passwordsMatch && <p className="mt-1 text-xs text-green-600">✓ Passwords match</p>}
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading || !rules.every((r) => r.ok) || !passwordsMatch}
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            {isLoading ? "Creating account…" : "Create account"}
          </button>

          <p className="text-center text-xs text-gray-400">
            By creating an account you agree to our{" "}
            <a href="/terms" className="underline hover:text-gray-600">
              Terms &amp; Conditions
            </a>{" "}
            and{" "}
            <a href="/privacy" className="underline hover:text-gray-600">
              Privacy Policy
            </a>
            .
          </p>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-blue-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
