import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { MessageStatus } from "@prisma/client";
import MessageStatusButton from "@/components/admin/messages/MessageStatusButton";
import DeleteMessageButton from "@/components/admin/messages/DeleteMessageButton";
import ReplyComposer from "@/components/admin/messages/ReplyComposer";

const STATUS_STYLES: Record<MessageStatus, string> = {
  UNREAD: "bg-red-100 text-red-700",
  READ: "bg-gray-100 text-gray-600",
  RESOLVED: "bg-green-100 text-green-700",
};

export default async function AdminMessageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") notFound();

  const { id } = await params;

  const message = await prisma.customerMessage.findUnique({
    where: { id },
    include: {
      product: { select: { id: true, title: true, slug: true } },
      user: { select: { id: true, name: true } },
    },
  });

  if (!message) notFound();

  // Auto-mark as READ on first view
  if (message.status === "UNREAD") {
    await prisma.customerMessage.update({
      where: { id },
      data: { status: "READ" },
    });
    message.status = "READ";
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/messages" className="text-sm text-gray-500 hover:text-gray-700">
          ← Messages
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-700 truncate max-w-xs">{message.subject}</span>
      </div>

      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          {/* Header */}
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{message.subject}</h1>
              <p className="mt-0.5 text-sm text-gray-500">
                {new Date(message.createdAt).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[message.status]}`}
            >
              {message.status.charAt(0) + message.status.slice(1).toLowerCase()}
            </span>
          </div>

          {/* Sender info */}
          <div className="mb-5 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm">
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              <div>
                <span className="text-gray-400">From</span>{" "}
                <span className="font-medium text-gray-900">{message.name}</span>
              </div>
              <div>
                <span className="text-gray-400">Email</span>{" "}
                <a
                  href={`mailto:${message.email}`}
                  className="font-medium text-red-600 hover:underline"
                >
                  {message.email}
                </a>
              </div>
              {message.user && (
                <div>
                  <span className="text-gray-400">Account</span>{" "}
                  <Link
                    href={`/admin/customers/${message.user.id}`}
                    className="font-medium text-red-600 hover:underline"
                  >
                    {message.user.name ?? "View"}
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Product link */}
          {message.product && (
            <div className="mb-5 flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-sm">
              <svg
                className="h-4 w-4 flex-shrink-0 text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
              <span className="text-blue-700">About: </span>
              <Link
                href={`/product/${message.product.slug}`}
                target="_blank"
                className="font-medium text-blue-700 hover:underline"
              >
                {message.product.title}
              </Link>
            </div>
          )}

          {/* Message body */}
          <div className="mb-6 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
            {message.body}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <ReplyComposer messageId={message.id} toName={message.name} toEmail={message.email} />

            <MessageStatusButton messageId={message.id} currentStatus={message.status} />

            <DeleteMessageButton messageId={message.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
