import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Unsubscribe — Casa Cards & Collectibles",
  robots: { index: false },
};

type Props = { searchParams: Promise<{ status?: string; email?: string }> };

export default async function UnsubscribePage({ searchParams }: Props) {
  const { status, email } = await searchParams;
  const success = status === "success";

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-5 px-4 py-24 text-center">
      {success ? (
        <>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-8 w-8 text-green-600"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Unsubscribed</h1>
          <p className="text-gray-500">
            {email ? (
              <>
                <strong>{email}</strong> has been removed from our marketing emails.
              </>
            ) : (
              "You've been removed from our marketing emails."
            )}
          </p>
          <p className="text-sm text-gray-400">
            You&apos;ll still receive emails about your orders, offers, and account activity.
          </p>
        </>
      ) : (
        <>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Something went wrong</h1>
          <p className="text-gray-500">
            We couldn&apos;t process your unsubscribe request. Please try again or contact us
            directly.
          </p>
        </>
      )}

      <Link
        href="/"
        className="mt-2 rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 transition"
      >
        Back to Home
      </Link>
    </div>
  );
}
