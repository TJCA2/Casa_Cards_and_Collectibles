"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import type { LoginStatusResponse } from "@/lib/schemas";

// Cloudflare Turnstile test site key — always passes (used when no key is configured)
const TURNSTILE_TEST_SITEKEY = "1x00000000000000000000AA";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justVerified = searchParams.get("verified") === "true";
  const justReset = searchParams.get("reset") === "true";
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [locked, setLocked] = useState(false);

  const turnstileRef = useRef<TurnstileInstance>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? TURNSTILE_TEST_SITEKEY;

  // Check status for the current IP on mount
  useEffect(() => {
    void fetchStatus();
  }, []);

  async function fetchStatus() {
    try {
      const res = await fetch("/api/auth/login-status");
      if (!res.ok) return;
      const data: LoginStatusResponse = await res.json();
      setCaptchaRequired(data.captchaRequired);
      setLocked(data.locked);
    } catch {
      // Status check is best-effort — don't block the UI on failure
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isLoading || locked) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        captchaToken,
        redirect: false,
      });

      if (!result) {
        setError("An unexpected error occurred. Please try again.");
        return;
      }

      if (result.error === "AccountLocked") {
        setLocked(true);
        setError(null); // show the locked banner instead
      } else if (result.error) {
        setError("Invalid email or password.");
        // Re-check status — captcha may now be required
        await fetchStatus();
        // Reset the Turnstile widget so a fresh token can be obtained
        turnstileRef.current?.reset();
        setCaptchaToken("");
      } else if (result.ok) {
        router.push(callbackUrl);
        router.refresh();
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Sign in</h1>
      <p className="text-sm text-gray-500 mb-6">Welcome back to Casa Cards &amp; Collectibles</p>

      {justVerified && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Your email has been verified. You can now sign in.
        </div>
      )}

      {justReset && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Password updated successfully. Please sign in with your new password.
        </div>
      )}

      {locked && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Account temporarily locked. Too many failed login attempts. Please try again in
          15&nbsp;minutes.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
            disabled={locked || isLoading}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <a href="/auth/forgot-password" className="text-xs text-blue-600 hover:underline">
              Forgot password?
            </a>
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={locked || isLoading}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        {captchaRequired && !locked && (
          <div>
            <p className="mb-2 text-xs text-gray-500">
              Please complete the security check to continue.
            </p>
            <Turnstile
              ref={turnstileRef}
              siteKey={siteKey}
              onSuccess={(token) => setCaptchaToken(token)}
              onExpire={() => setCaptchaToken("")}
              onError={() => setCaptchaToken("")}
            />
          </div>
        )}

        <button
          type="submit"
          disabled={locked || isLoading || (captchaRequired && !captchaToken)}
          className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
        >
          {isLoading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Don&apos;t have an account?{" "}
        <a href="/auth/register" className="text-blue-600 hover:underline">
          Create one
        </a>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Suspense
        fallback={
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-md text-center text-sm text-gray-500">
            Loading…
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
