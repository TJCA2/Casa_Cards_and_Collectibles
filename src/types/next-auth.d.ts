import { type DefaultSession } from "next-auth";
import { type Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      emailVerified: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    emailVerified: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    emailVerified: boolean;
    signedInAt?: number; // ms timestamp of original sign-in — used for session invalidation
  }
}
