"use client";

import Image from "next/image";
import Link from "next/link";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 text-center">
      {/* Logo */}
      <Link href="/" aria-label="Casa Cards & Collectibles — Home">
        <Image
          src="/image.png"
          alt="Casa Cards & Collectibles logo"
          width={56}
          height={56}
          priority
        />
      </Link>

      {/* Message */}
      <p className="mt-8 text-8xl font-black text-gray-100 select-none">500</p>
      <h1 className="-mt-4 text-2xl font-bold text-gray-900">Something Went Wrong</h1>
      <p className="mt-3 max-w-sm text-sm text-gray-500">
        We hit a snag on our end. Try again — if the problem persists, reach out and we&apos;ll sort
        it out.
      </p>

      {/* CTAs */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={reset}
          className="rounded-xl bg-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
        >
          Try Again
        </button>
        <Link
          href="/shop"
          className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:bg-gray-50"
        >
          Return to Shop
        </Link>
      </div>
    </div>
  );
}
