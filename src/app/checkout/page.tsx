import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CheckoutForm from "./CheckoutForm";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const session = await getServerSession(authOptions);

  const defaultAddress = session
    ? await prisma.address.findFirst({
        where: { userId: session.user.id, isDefault: true },
        select: { name: true, line1: true, line2: true, city: true, state: true, zip: true },
      })
    : null;

  return (
    <CheckoutForm
      userEmail={session?.user?.email ?? null}
      isLoggedIn={!!session}
      defaultAddress={defaultAddress}
    />
  );
}
