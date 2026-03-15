import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ErrorContent from "./ErrorContent";

export const metadata: Metadata = {
  title: "Authentication Error | Casa Cards & Collectibles",
  description:
    "An error occurred during sign in to Casa Cards & Collectibles. Please try again or contact support.",
  robots: { index: false, follow: false },
};

export default function AuthErrorPage() {
  return (
    <>
      <Header />
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-16">
        <ErrorContent />
      </main>
      <Footer />
    </>
  );
}
