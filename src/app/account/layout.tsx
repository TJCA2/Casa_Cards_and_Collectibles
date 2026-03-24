import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import AccountSidebar from "@/components/account/AccountSidebar";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/login?callbackUrl=/account");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="mb-8 text-2xl font-bold text-gray-900 lg:hidden">My Account</h1>

      <div className="lg:flex lg:gap-10">
        <AccountSidebar />

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
