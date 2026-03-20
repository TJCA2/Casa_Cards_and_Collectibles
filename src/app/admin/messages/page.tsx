import Link from "next/link";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { MessageStatus } from "@prisma/client";

const STATUS_STYLES: Record<MessageStatus, string> = {
  UNREAD: "bg-red-100 text-red-700",
  READ: "bg-gray-100 text-gray-500",
  RESOLVED: "bg-green-100 text-green-700",
};

const VALID_STATUSES: MessageStatus[] = ["UNREAD", "READ", "RESOLVED"];

type SearchParams = Promise<{ status?: string; page?: string }>;

export default async function AdminMessagesPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") notFound();

  const sp = await searchParams;
  const statusFilter =
    sp.status && VALID_STATUSES.includes(sp.status as MessageStatus)
      ? (sp.status as MessageStatus)
      : undefined;

  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const limit = 20;
  const skip = (page - 1) * limit;

  const where = statusFilter ? { status: statusFilter } : {};

  const [messages, total, unreadCount] = await Promise.all([
    prisma.customerMessage.findMany({
      where,
      orderBy: [
        // UNREAD first, then by date desc
        { status: "asc" },
        { createdAt: "desc" },
      ],
      skip,
      take: limit,
      include: {
        product: { select: { id: true, title: true, slug: true } },
      },
    }),
    prisma.customerMessage.count({ where }),
    prisma.customerMessage.count({ where: { status: "UNREAD" } }),
  ]);

  // Sort UNREAD to top
  messages.sort((a, b) => {
    if (a.status === "UNREAD" && b.status !== "UNREAD") return -1;
    if (a.status !== "UNREAD" && b.status === "UNREAD") return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const pages = Math.ceil(total / limit);

  const filterLinks: { label: string; value?: string; count?: number }[] = [
    { label: "All" },
    { label: "Unread", value: "UNREAD", count: unreadCount },
    { label: "Read", value: "READ" },
    { label: "Resolved", value: "RESOLVED" },
  ];

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Messages
          {unreadCount > 0 && (
            <span className="ml-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-bold text-white">
              {unreadCount}
            </span>
          )}
        </h1>
      </div>

      {/* Status filter tabs */}
      <div className="mb-5 flex flex-wrap gap-2">
        {filterLinks.map((f) => {
          const active = (f.value ?? "") === (statusFilter ?? "");
          const href = f.value ? `/admin/messages?status=${f.value}` : "/admin/messages";
          return (
            <Link
              key={f.label}
              href={href}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                active ? "bg-red-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {f.label}
              {f.count !== undefined && f.count > 0 && (
                <span
                  className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold ${
                    active ? "bg-white/20 text-white" : "bg-red-600 text-white"
                  }`}
                >
                  {f.count}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {messages.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center">
          <p className="text-gray-400">No messages found.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Sender
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Subject
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 hidden sm:table-cell">
                  Product
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
                  Received
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {messages.map((msg) => {
                const isUnread = msg.status === "UNREAD";
                return (
                  <tr
                    key={msg.id}
                    className={`cursor-pointer transition-colors ${
                      isUnread ? "bg-red-50/40 hover:bg-red-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <Link href={`/admin/messages/${msg.id}`} className="block">
                        <span
                          className={`block ${isUnread ? "font-bold text-gray-900" : "font-medium text-gray-700"}`}
                        >
                          {msg.name}
                        </span>
                        <span className="block text-xs text-gray-400">{msg.email}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/messages/${msg.id}`}
                        className={`block max-w-xs truncate ${isUnread ? "font-semibold text-gray-900" : "text-gray-700"}`}
                      >
                        {msg.subject}
                      </Link>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {msg.product ? (
                        <Link
                          href={`/product/${msg.product.slug}`}
                          target="_blank"
                          className="max-w-[160px] truncate block text-xs text-blue-600 hover:underline"
                        >
                          {msg.product.title}
                        </Link>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(msg.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[msg.status]}`}
                      >
                        {msg.status.charAt(0) + msg.status.slice(1).toLowerCase()}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <span>
            {total} message{total !== 1 ? "s" : ""}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/messages?${statusFilter ? `status=${statusFilter}&` : ""}page=${page - 1}`}
                className="rounded-lg border border-gray-200 px-3 py-1.5 hover:bg-gray-50"
              >
                ← Prev
              </Link>
            )}
            {page < pages && (
              <Link
                href={`/admin/messages?${statusFilter ? `status=${statusFilter}&` : ""}page=${page + 1}`}
                className="rounded-lg border border-gray-200 px-3 py-1.5 hover:bg-gray-50"
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
