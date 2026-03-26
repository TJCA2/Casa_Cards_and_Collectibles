import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { type Prisma, OrderStatus, PaymentProvider } from "@prisma/client";
import OrderStatusBadge from "@/components/account/OrderStatusBadge";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function str(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

export default async function AdminOrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = str(params.q).trim();
  const status = str(params.status) as OrderStatus | "";
  const provider = str(params.provider) as PaymentProvider | "";
  const from = str(params.from);
  const to = str(params.to);
  const page = Math.max(1, Number(str(params.page)) || 1);

  const where: Prisma.OrderWhereInput = {
    ...(status && { status: status as OrderStatus }),
    ...(provider && { paymentProvider: provider as PaymentProvider }),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}),
          },
        }
      : {}),
    ...(q && {
      OR: [
        { orderNumber: { contains: q, mode: "insensitive" } },
        { customerEmail: { contains: q, mode: "insensitive" } },
        { user: { email: { contains: q, mode: "insensitive" } } },
      ],
    }),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentProvider: true,
        totalAmount: true,
        createdAt: true,
        customerEmail: true,
        user: { select: { name: true, email: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function pageUrl(p: number) {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (status) u.set("status", status);
    if (provider) u.set("provider", provider);
    if (from) u.set("from", from);
    if (to) u.set("to", to);
    if (p > 1) u.set("page", String(p));
    const s = u.toString();
    return `/admin/orders${s ? `?${s}` : ""}`;
  }

  function filterUrl(key: string, val: string) {
    const u = new URLSearchParams();
    if (key !== "q" && q) u.set("q", q);
    if (key !== "status" && status) u.set("status", status);
    if (key !== "provider" && provider) u.set("provider", provider);
    if (key !== "from" && from) u.set("from", from);
    if (key !== "to" && to) u.set("to", to);
    if (val) u.set(key, val);
    const s = u.toString();
    return `/admin/orders${s ? `?${s}` : ""}`;
  }

  const statusOptions: { label: string; val: string }[] = [
    { label: "All", val: "" },
    ...Object.values(OrderStatus).map((s) => ({ label: s[0] + s.slice(1).toLowerCase(), val: s })),
  ];

  const providerOptions: { label: string; val: string }[] = [
    { label: "All Providers", val: "" },
    { label: "PayPal", val: "PAYPAL" },
  ];

  const hasFilters = q || status || provider || from || to;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="mt-0.5 text-sm text-gray-500">{total.toLocaleString()} total</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <form method="GET" action="/admin/orders" className="flex gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          {provider && <input type="hidden" name="provider" value={provider} />}
          {from && <input type="hidden" name="from" value={from} />}
          {to && <input type="hidden" name="to" value={to} />}
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Order # or email…"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Search
          </button>
        </form>

        {/* Status filter */}
        <div className="flex flex-wrap gap-1">
          {statusOptions.map((f) => (
            <Link
              key={f.val}
              href={filterUrl("status", f.val)}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                status === f.val
                  ? "bg-red-600 text-white"
                  : "border border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>

        {/* Provider filter */}
        <div className="flex gap-1">
          {providerOptions.map((f) => (
            <Link
              key={f.val}
              href={filterUrl("provider", f.val)}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                provider === f.val
                  ? "bg-gray-800 text-white"
                  : "border border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>

        {/* Date range */}
        <form method="GET" action="/admin/orders" className="flex items-center gap-2">
          {q && <input type="hidden" name="q" value={q} />}
          {status && <input type="hidden" name="status" value={status} />}
          {provider && <input type="hidden" name="provider" value={provider} />}
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
          <span className="text-xs text-gray-400">to</span>
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
          <button
            type="submit"
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            Apply
          </button>
        </form>

        {hasFilters && (
          <Link href="/admin/orders" className="text-sm text-gray-400 hover:text-gray-600">
            Clear filters
          </Link>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Order</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Customer</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Provider</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No orders found.
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const email = order.user?.email ?? order.customerEmail ?? "—";
                const name = order.user?.name ?? null;
                return (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/orders/${order.orderNumber}`}
                        className="font-medium text-red-600 hover:text-red-700"
                      >
                        {order.orderNumber}
                      </Link>
                      <div className="text-xs text-gray-400">
                        {order._count.items} item{order._count.items !== 1 ? "s" : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {name && <div className="font-medium text-gray-900">{name}</div>}
                      <div className="text-gray-500">{email}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {order.createdAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {order.paymentProvider === "STRIPE" ? "Stripe" : "PayPal"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      ${Number(order.totalAmount).toFixed(2)}
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
