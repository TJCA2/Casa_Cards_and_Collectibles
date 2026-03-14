import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ProfileForm from "@/components/account/ProfileForm";

export const metadata: Metadata = { title: "Profile Settings" };

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function ProfilePage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login?callbackUrl=/account/profile");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, name: true, phone: true, pendingEmail: true },
  });

  if (!user) redirect("/auth/login");

  const params = await searchParams;
  const emailChangedSuccess = params.emailChanged === "true";

  return <ProfileForm user={user} emailChangedSuccess={emailChangedSuccess} />;
}
