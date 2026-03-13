import { prisma } from "@/lib/prisma";

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCK_THRESHOLD = 5; // lock after this many failures
const CAPTCHA_THRESHOLD = 3; // require captcha after this many failures

// Count recent failures for a specific email+IP combination
async function recentEmailIpFailures(email: string, ip: string): Promise<number> {
  const since = new Date(Date.now() - WINDOW_MS);
  return prisma.loginAttempt.count({
    where: {
      email: email.toLowerCase(),
      ipAddress: ip,
      success: false,
      createdAt: { gte: since },
    },
  });
}

// Count recent failures originating from an IP (across all emails)
async function recentIpFailures(ip: string): Promise<number> {
  const since = new Date(Date.now() - WINDOW_MS);
  return prisma.loginAttempt.count({
    where: {
      ipAddress: ip,
      success: false,
      createdAt: { gte: since },
    },
  });
}

export interface LoginStatus {
  locked: boolean;
  captchaRequired: boolean;
}

/**
 * Check lockout/captcha status for a specific email+IP pair.
 * Used by the authorize callback before processing credentials.
 */
export async function checkLoginStatus(email: string, ip: string): Promise<LoginStatus> {
  const count = await recentEmailIpFailures(email, ip);
  return {
    locked: count >= LOCK_THRESHOLD,
    captchaRequired: count >= CAPTCHA_THRESHOLD,
  };
}

/**
 * Check lockout/captcha status for an IP only (no email).
 * Used by the public status API to avoid email enumeration.
 */
export async function checkIpLoginStatus(ip: string): Promise<LoginStatus> {
  const count = await recentIpFailures(ip);
  return {
    locked: count >= LOCK_THRESHOLD,
    captchaRequired: count >= CAPTCHA_THRESHOLD,
  };
}

/**
 * Record a login attempt. Never log the password.
 */
export async function recordLoginAttempt(
  email: string,
  ip: string,
  success: boolean,
): Promise<void> {
  await prisma.loginAttempt.create({
    data: {
      email: email.toLowerCase(),
      ipAddress: ip,
      success,
    },
  });
}

/**
 * Validate a Cloudflare Turnstile token server-side.
 * Falls back to true in development when no secret key is configured.
 */
export async function validateTurnstile(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    // Allow bypass in development only
    return process.env.NODE_ENV === "development";
  }

  if (!token) return false;

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }).toString(),
    });
    const data = (await response.json()) as { success: boolean };
    return data.success === true;
  } catch {
    // Network failure — fail closed (reject)
    return false;
  }
}
