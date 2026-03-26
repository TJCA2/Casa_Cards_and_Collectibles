"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ReplyComposerProps {
  messageId: string;
  toName: string;
  toEmail: string;
}

export default function ReplyComposer({ messageId, toName: _toName, toEmail }: ReplyComposerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [replyText, setReplyText] = useState(
    "Thank you for reaching out to Casa Cards & Collectibles.\n\n",
  );
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/messages/${messageId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replyText }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to send reply");
      }
      setSent(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSending(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
        Reply via Email
      </button>
    );
  }

  if (sent) {
    return (
      <div className="mt-4 w-full rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
        Reply sent to <strong>{toEmail}</strong>. Message marked as resolved.
      </div>
    );
  }

  return (
    <div className="mt-4 w-full rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">
          Reply to <span className="text-red-600">{toEmail}</span>
        </p>
        <button
          onClick={() => setOpen(false)}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Cancel
        </button>
      </div>

      <p className="mb-2 text-xs text-gray-500 bg-gray-100 border border-gray-200 rounded-lg px-3 py-2">
        Just type your response — the greeting and sign-off are added automatically.
      </p>

      <textarea
        value={replyText}
        onChange={(e) => setReplyText(e.target.value)}
        rows={6}
        placeholder="Type your response here…"
        disabled={sending}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-100 leading-relaxed"
      />

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={handleSend}
          disabled={sending || replyText.trim().length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {sending ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Sending…
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
              Send Reply
            </>
          )}
        </button>
        <span className="text-xs text-gray-400">Sent via Resend · marks message as Resolved</span>
      </div>
    </div>
  );
}
