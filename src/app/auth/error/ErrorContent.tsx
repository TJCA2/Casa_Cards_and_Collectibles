"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const ERROR_MESSAGES: Record<string, string> = {
  Configuration: "There is a problem with the server configuration.",
  AccessDenied: "You do not have permission to sign in.",
  Verification:
    "The sign-in link is no longer valid. It may have already been used or it has expired.",
  AccountLocked:
    "Your account has been temporarily locked due to too many failed login attempts. Please try again in 15 minutes.",
  "invalid-token": "This verification link is invalid. Please register again.",
  "expired-token":
    "This verification link has expired. Please register again with the same email address.",
  "missing-token": "No verification token was provided.",
  Default: "An error occurred during sign in. Please try again.",
};

function ErrorCard() {
  const searchParams = useSearchParams();
  const errorCode = searchParams.get("error") ?? "Default";
  const message = ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.Default;

  return (
    <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-md text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
        <svg
          className="h-6 w-6 text-red-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      </div>

      <h1 className="mb-2 text-xl font-bold text-gray-900">Authentication Error</h1>
      <p className="mb-6 text-sm text-gray-600">{message}</p>

      <Link
        href="/auth/login"
        className="inline-block rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
      >
        Back to Sign In
      </Link>
    </div>
  );
}

export default function ErrorContent() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-md text-center text-sm text-gray-500">
          Loading…
        </div>
      }
    >
      <ErrorCard />
    </Suspense>
  );
}
