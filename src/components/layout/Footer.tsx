"use client";

import Link from "next/link";
import { useState } from "react";

const SHOP_LINKS = [
  { href: "/shop", label: "All Products" },
  { href: "/category/baseball-cards", label: "Baseball Cards" },
  { href: "/category/basketball-cards", label: "Basketball Cards" },
  { href: "/category/football-cards", label: "Football Cards" },
];

const SUPPORT_LINKS = [
  { href: "/contact", label: "Contact Us" },
  { href: "/returns", label: "Returns & Refunds" },
  { href: "/shipping", label: "Shipping Policy" },
];

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms & Conditions" },
];

export default function Footer() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setStatus(res.ok ? "success" : "error");
      if (res.ok) setEmail("");
    } catch {
      setStatus("error");
    }
  }

  return (
    <footer className="bg-black text-white/70">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <p className="text-sm font-bold uppercase tracking-widest text-white">
              Casa Cards & Collectibles
            </p>
            <p className="mt-2 text-sm">Your source for sports cards &amp; collectibles.</p>
          </div>

          {/* Shop links */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white">Shop</p>
            <ul className="space-y-2">
              {SHOP_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support links */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white">
              Support
            </p>
            <ul className="space-y-2">
              {SUPPORT_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mb-3 mt-5 text-xs font-semibold uppercase tracking-widest text-white">
              Legal
            </p>
            <ul className="space-y-2">
              {LEGAL_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white">
              Stay Updated
            </p>
            <p className="mb-3 text-sm">Get new arrivals and deals in your inbox.</p>
            <form onSubmit={handleSubscribe} className="flex flex-col gap-2">
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/40 focus:border-red-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={status === "loading" || status === "success"}
                className="rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {status === "loading"
                  ? "Subscribing…"
                  : status === "success"
                    ? "Subscribed!"
                    : "Subscribe"}
              </button>
              {status === "error" && (
                <p className="text-xs text-red-400">Something went wrong. Please try again.</p>
              )}
            </form>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-white/40">
          © {new Date().getFullYear()} Casa Cards &amp; Collectibles. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
