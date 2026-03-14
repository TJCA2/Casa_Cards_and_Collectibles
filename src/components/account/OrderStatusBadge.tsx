import { OrderStatus } from "@prisma/client";

const STATUS_STYLES: Record<OrderStatus, { bg: string; text: string; label: string }> = {
  PENDING: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Pending" },
  PAID: { bg: "bg-blue-100", text: "text-blue-800", label: "Paid" },
  PROCESSING: { bg: "bg-purple-100", text: "text-purple-800", label: "Processing" },
  SHIPPED: { bg: "bg-indigo-100", text: "text-indigo-800", label: "Shipped" },
  DELIVERED: { bg: "bg-green-100", text: "text-green-800", label: "Delivered" },
  CANCELLED: { bg: "bg-red-100", text: "text-red-800", label: "Cancelled" },
  REFUNDED: { bg: "bg-gray-100", text: "text-gray-700", label: "Refunded" },
};

export default function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { bg, text, label } = STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${bg} ${text}`}
    >
      {label}
    </span>
  );
}
