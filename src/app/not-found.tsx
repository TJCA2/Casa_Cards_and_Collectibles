import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
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

      {/* 404 */}
      <p className="mt-8 text-8xl font-black text-gray-100 select-none">404</p>
      <h1 className="-mt-4 text-2xl font-bold text-gray-900">Page Not Found</h1>
      <p className="mt-3 max-w-sm text-sm text-gray-500">
        The card you&apos;re looking for may have sold or moved. Let&apos;s get you back in the
        game.
      </p>

      {/* CTAs */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/shop"
          className="rounded-xl bg-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
        >
          Browse All Products
        </Link>
        <Link
          href="/"
          className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:bg-gray-50"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
