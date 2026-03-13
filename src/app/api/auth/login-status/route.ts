import { type NextRequest, NextResponse } from "next/server";
import { checkIpLoginStatus } from "@/lib/login-protection";
import type { LoginStatusResponse } from "@/lib/schemas";

// GET /api/auth/login-status
// Returns whether the current IP requires a CAPTCHA or is locked out.
// Uses IP only (not email) to prevent user enumeration via this endpoint.
export async function GET(request: NextRequest): Promise<NextResponse<LoginStatusResponse>> {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  const { locked, captchaRequired } = await checkIpLoginStatus(ip);

  const body: LoginStatusResponse = locked
    ? { locked, captchaRequired: true, retryAfterSeconds: 15 * 60 }
    : { locked, captchaRequired };

  return NextResponse.json(body);
}
