import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { type Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function str(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

export default async function AdminCustomersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = str(params.q).trim();
  const bannedFilter = str(params.banned);
  const page = Math.max(1, Number(str(params.page)) || 1);

  const where: Prisma.UserWhereInput = {
    ...(q && {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    }),
    ...(bannedFilter === "true" && { banned: true }),
  };

  const [customers, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        banned: true,
        createdAt: true,
        _count: { select: { orders: true } },
        orders: {
          where: { status: { notIn: ["CANCELLED", "REFUNDED"] } },
          select: { totalAmount: true },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function pageUrl(p: number) {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (bannedFilter) u.set("banned", bannedFilter);
    if (p > 1) u.set("page", String(p));
    const s = u.toString();
    return `/admin/customers${s ? `?${s}` : ""}`;
  }

  function filterUrl(key: string, val: string) {
    const u = new URLSearchParams();
    if (key !== "q" && q) u.set("q", q);
    if (key !== "banned" && bannedFilter) u.set("banned", bannedFilter);
    if (val) u.set(key, val);
    const s = u.toString();
    return `/admin/customers${s ? `?${s}` : ""}`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="mt-0.5 text-sm text-gray-500">{total.toLocaleString()} total</p>
        </div>
        <a
          href="/api/admin/customers/export"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Export CSV
        </a>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <form method="GET" action="/admin/customers" className="flex gap-2">
          {bannedFilter && <input type="hidden" name="banned" value={bannedFilter} />}
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search name or email…"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Search
          </button>
        </form>

        <div className="flex gap-1">
          {[
            { label: "All", val: "" },
            { label: "Banned", val: "true" },
          ].map((f) => (
            <Link
              key={f.val}
              href={filterUrl("banned", f.val)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                bannedFilter === f.val
                  ? "bg-red-600 text-white"
                  : "border border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>

        {(q || bannedFilter) && (
          <Link href="/admin/customers" className="text-sm text-gray-400 hover:text-gray-600">
            Clear filters
          </Link>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Customer</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Joined</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700">Orders</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700">Total Spent</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {customers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  No customers found.
                </td>
              </tr>
            ) : (
              customers.map((c) => {
                const totalSpent = c.orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
                return (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/customers/${c.id}`}
                        className="font-medium text-red-600 hover:text-red-700"
                      >
                        {c.name ?? <span className="italic text-gray-400">No name</span>}
                      </Link>
                      <div className="text-xs text-gray-500">{c.email}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {c.createdAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{c._count.orders}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      ${totalSpent.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {c.banned && (
                          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                            Banned
                          </span>
                        )}
                        {!c.emailVerified && (
                          <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                            Unverified
                          </span>
                        )}
                        {!c.banned && c.emailVerified && (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                            Active
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-gray-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={pageUrl(page - 1)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50"
              >
                ← Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={pageUrl(page + 1)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50"
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
