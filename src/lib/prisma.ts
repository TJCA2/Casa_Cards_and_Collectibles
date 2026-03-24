import { PrismaClient } from "@prisma/client";

// Prevent multiple PrismaClient instances in Next.js dev (hot reload creates new instances)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Supabase uses PgBouncer in transaction mode which requires:
 *   - pgbouncer=true  (disables prepared statements)
 *   - pool_timeout    (how long to wait for a free connection — default 10s is too low)
 * We patch the DATABASE_URL here so these are always set regardless of what's in .env.
 */
function buildDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL ?? "";
  try {
    const url = new URL(raw);
    if (!url.searchParams.has("pgbouncer")) url.searchParams.set("pgbouncer", "true");
    if (!url.searchParams.has("pool_timeout")) url.searchParams.set("pool_timeout", "30");
    return url.toString();
  } catch {
    return raw; // not a valid URL — return as-is and let Prisma surface the error
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error"],
    datasources: { db: { url: buildDatabaseUrl() } },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
