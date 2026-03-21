import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Subscription Confirmed — Casa Cards & Collectibles",
  robots: { index: false },
};

type Props = { searchParams: Promise<{ status?: string }> };

export default async function NewsletterConfirmedPage({ searchParams }: Props) {
  const { status } = await searchParams;
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
          <h1 className="text-2xl font-bold text-gray-900">You&apos;re subscribed!</h1>
          <p className="text-gray-500">
            Welcome to the Casa Cards &amp; Collectibles newsletter. You&apos;ll be the first to
            hear about new arrivals, restocks, and exclusive deals.
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
          <h1 className="text-2xl font-bold text-gray-900">Link expired or invalid</h1>
          <p className="text-gray-500">
            This confirmation link is no longer valid. Try subscribing again and we&apos;ll send a
            fresh one.
          </p>
        </>
      )}

      <Link
        href="/shop"
        className="mt-2 rounded-lg bg-red-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition"
      >
        Browse the Shop
      </Link>
    </div>
  );
}
