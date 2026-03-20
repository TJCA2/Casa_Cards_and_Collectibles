import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/schemas";
import { checkLoginStatus, recordLoginAttempt, validateTurnstile } from "@/lib/login-protection";

const secureCookies: NextAuthOptions["cookies"] = {
  sessionToken: {
    name: "__Secure-next-auth.session-token",
    options: {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: true,
    },
  },
};

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        // captchaToken is passed programmatically — not shown in any generated form
        captchaToken: { label: "CAPTCHA Token", type: "text" },
      },
      async authorize(credentials, req) {
        // ── Extract client IP from forwarded headers ──────────────────────────
        const fwdFor = req.headers?.["x-forwarded-for"];
        const ip =
          (typeof fwdFor === "string" ? fwdFor.split(",")[0]?.trim() : undefined) ?? "unknown";

        // ── Validate credentials shape ────────────────────────────────────────
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const captchaToken = credentials?.captchaToken ?? "";

        // ── Check lockout / captcha status ────────────────────────────────────
        const { locked, captchaRequired } = await checkLoginStatus(email, ip);

        if (locked) {
          await recordLoginAttempt(email, ip, false);
          throw new Error("AccountLocked");
        }

        // ── Validate CAPTCHA when required ────────────────────────────────────
        // Only enforce CAPTCHA if Turnstile is actually configured — if the secret
        // key is absent, skipping is safer than fail-closed (which would permanently
        // block legitimate users after 3 failed attempts with no way to recover).
        if (captchaRequired && process.env.TURNSTILE_SECRET_KEY) {
          const captchaValid = await validateTurnstile(captchaToken);
          if (!captchaValid) {
            return null;
          }
        }

        // ── Look up user ──────────────────────────────────────────────────────
        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });

        if (!user || !user.passwordHash) {
          await recordLoginAttempt(email, ip, false);
          return null;
        }

        if (!user.emailVerified) {
          await recordLoginAttempt(email, ip, false);
          return null;
        }

        if (user.banned) {
          await recordLoginAttempt(email, ip, false);
          throw new Error("AccountSuspended");
        }

        // ── Verify password ───────────────────────────────────────────────────
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          await recordLoginAttempt(email, ip, false);
          return null;
        }

        // ── Success ───────────────────────────────────────────────────────────
        await recordLoginAttempt(email, ip, true);

        return {
          id: user.id,
          email: user.email,
          name: null,
          role: user.role,
          emailVerified: user.emailVerified,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
    updateAge: 24 * 60 * 60, // rotate token every 24 hours
  },

  cookies: process.env.NODE_ENV === "production" ? secureCookies : {},

  callbacks: {
    async jwt({ token, user }) {
      // On initial sign-in, populate token fields and stamp sign-in time
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.emailVerified = Boolean(user.emailVerified);
        // signedInAt is the original sign-in timestamp — never overwritten on refresh
        token.signedInAt = Date.now();
      }

      // On every token check, invalidate if password was changed after sign-in
      if (token.id && token.signedInAt) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { passwordChangedAt: true },
        });

        if (
          dbUser?.passwordChangedAt &&
          dbUser.passwordChangedAt.getTime() > (token.signedInAt as number)
        ) {
          // Password changed after this session was created — force re-login
          return {} as typeof token;
        }
      }

      return token;
    },
    async session({ session, token }) {
      // If the token was invalidated (empty), reflect that in the session
      if (!token.id) return session;

      session.user.id = token.id;
      session.user.role = token.role;
      session.user.emailVerified = token.emailVerified;
      return session;
    },
  },

  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },

  secret: process.env.NEXTAUTH_SECRET as string,
};
