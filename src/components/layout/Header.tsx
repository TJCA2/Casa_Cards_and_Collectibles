"use client";

import Image from "next/image";
import Link from "next/link";
import MobileNav from "./MobileNav";
import { useCart } from "@/context/CartContext";
import { useSession } from "next-auth/react";

export default function Header() {
  const { itemCount, openCart } = useCart();
  const { data: session, status } = useSession();

  return (
    <header className="sticky top-0 z-30 bg-black shadow-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        {/* Left: mobile hamburger + logo */}
        <div className="flex items-center gap-3">
          <MobileNav />

          <Link
            href="/"
            className="flex items-center gap-2"
            aria-label="Casa Cards & Collectibles — Home"
          >
            <Image
              src="/logo.png"
              alt="Casa Cards & Collectibles logo"
              width={44}
              height={44}
              className="invert"
              priority
            />
            <span className="hidden text-sm font-bold uppercase tracking-widest text-white sm:block">
              Casa Cards & Collectibles
            </span>
          </Link>
        </div>

        {/* Right: search + account + cart */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <Link href="/search" aria-label="Search" className="text-white/70 hover:text-white">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
              />
            </svg>
          </Link>

          {/* Account / Sign in */}
          {status !== "loading" &&
            (session ? (
              <Link
                href={session.user?.role === "ADMIN" ? "/admin" : "/account"}
                aria-label={session.user?.role === "ADMIN" ? "Admin panel" : "My account"}
                className="hidden text-white/70 hover:text-white md:block"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </Link>
            ) : (
              <Link
                href="/auth/login"
                className="hidden text-sm font-medium text-white/70 hover:text-white md:block"
              >
                Sign in
              </Link>
            ))}

          {/* Contact */}
          <Link href="/contact" aria-label="Contact us" className="text-white/70 hover:text-white">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </Link>

          {/* Cart */}
          <button
            onClick={openCart}
            aria-label={`Cart${itemCount > 0 ? ` (${itemCount} items)` : ""}`}
            className="relative text-white/70 hover:text-white"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1.6 8H19M7 13L5.4 5M10 21a1 1 0 1 0 2 0 1 1 0 0 0-2 0zm7 0a1 1 0 1 0 2 0 1 1 0 0 0-2 0z"
              />
            </svg>
            {itemCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                {itemCount > 9 ? "9+" : itemCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
