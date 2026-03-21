import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getEbayAuthUrl } from "@/lib/ebay/oauth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return new Response("Forbidden", { status: 403 });
  }

  const ruName = process.env.EBAY_RUNAME;
  if (!ruName) throw new Error("Missing EBAY_RUNAME environment variable.");

  const url = getEbayAuthUrl(ruName);
  console.log("[ebay/authorize] Redirecting to:", url);
  redirect(url);
}
