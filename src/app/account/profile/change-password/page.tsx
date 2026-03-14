"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";

const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "One number", test: (p: string) => /[0-9]/.test(p) },
  { label: "One special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export default function ChangePasswordPage() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const rulesPass = PASSWORD_RULES.every((r) => r.test(next));
  const confirmMatch = next === confirm;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    const errs: Record<string, string> = {};
    if (!current) errs.current = "Current password is required";
    if (!rulesPass) errs.next = "Password does not meet requirements";
    if (!confirmMatch) errs.confirm = "Passwords do not match";
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/account/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        issues?: Record<string, string[]>;
      };

      if (res.ok) {
        // Password changed — all sessions are invalidated by passwordChangedAt;
        // sign out this session and redirect to login
        await signOut({ callbackUrl: "/auth/login?passwordChanged=true" });
      } else if (res.status === 422 && data.issues) {
        const mapped: Record<string, string> = {};
        for (const [k, v] of Object.entries(data.issues)) {
          mapped[k] = Array.isArray(v) ? (v[0] ?? "") : String(v);
        }
        setFieldErrors(mapped);
      } else {
        setError(data.error ?? "Failed to change password. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/account/profile"
          className="mb-1 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Profile Settings
        </Link>
        <h2 className="text-xl font-bold text-gray-900">Change Password</h2>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 sm:max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Current password */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Current password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:border-red-400 focus:outline-none ${fieldErrors.current ? "border-red-400" : "border-gray-200"}`}
            />
            {fieldErrors.current && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.current}</p>
            )}
          </div>

          {/* New password */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              New password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:border-red-400 focus:outline-none ${fieldErrors.next ? "border-red-400" : "border-gray-200"}`}
            />
            {next.length > 0 && (
              <ul className="mt-2 space-y-1">
                {PASSWORD_RULES.map((r) => (
                  <li
                    key={r.label}
                    className={`flex items-center gap-1.5 text-xs ${r.test(next) ? "text-green-600" : "text-gray-400"}`}
                  >
                    <span aria-hidden="true">{r.test(next) ? "✓" : "○"}</span>
                    {r.label}
                  </li>
                ))}
              </ul>
            )}
            {fieldErrors.next && <p className="mt-1 text-xs text-red-600">{fieldErrors.next}</p>}
          </div>

          {/* Confirm new password */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Confirm new password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:border-red-400 focus:outline-none ${fieldErrors.confirm ? "border-red-400" : "border-gray-200"}`}
            />
            {confirm.length > 0 && !fieldErrors.confirm && (
              <p className={`mt-1 text-xs ${confirmMatch ? "text-green-600" : "text-red-600"}`}>
                {confirmMatch ? "Passwords match" : "Passwords do not match"}
              </p>
            )}
            {fieldErrors.confirm && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.confirm}</p>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <p className="text-xs text-gray-400">
            After changing your password you will be signed out of all devices.
          </p>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {saving ? "Updating…" : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
