import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ContactForm from "@/components/contact/ContactForm";

export const metadata = {
  title: "Contact Us",
  description:
    "Have a question about an order or a specific card? Get in touch with Casa Cards & Collectibles — we typically respond within 1–2 business days.",
};

export default async function ContactPage() {
  const session = await getServerSession(authOptions);

  let prefill = { name: "", email: "", isLoggedIn: false };

  if (session?.user?.id) {
    // Fetch fresh from DB — session token may be stale after profile updates
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    });
    prefill = {
      name: user?.name ?? "",
      email: user?.email ?? session.user.email ?? "",
      isLoggedIn: true,
    };
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold text-gray-900">Contact Us</h1>
      <p className="mb-8 text-gray-500">
        Have a question about an order, a product, or just want to say hello? Send us a message and
        we&apos;ll get back to you within 1–2 business days.
      </p>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-gray-100" />}>
        <ContactForm prefill={prefill} />
      </Suspense>
    </main>
  );
}
