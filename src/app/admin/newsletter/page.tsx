"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

interface SendResult {
  sent: number;
  failed: number;
  test?: boolean;
  noSubscribers?: boolean;
}

export default function AdminNewsletterPage() {
  const { data: session } = useSession();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [result, setResult] = useState<SendResult | null>(null);
  const [confirm, setConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/admin/newsletter/subscribers/count")
      .then((r) => r.json())
      .then((d: { count: number }) => setSubscriberCount(d.count))
      .catch(() => {});
  }, []);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    if (!cloudName) {
      alert(
        "Image upload requires Cloudinary to be configured (NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME). Paste a public image URL instead.",
      );
      // Reset the file input so the user can try again later
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "newsletter");
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });
      const data = (await res.json()) as { secure_url: string };
      setImageUrl(data.secure_url);
    } catch {
      alert("Image upload failed. Paste a URL manually instead.");
    } finally {
      setUploading(false);
    }
  }

  async function send(testEmail?: string) {
    setStatus("loading");
    setConfirm(false);
    setResult(null);
    try {
      const res = await fetch("/api/admin/newsletter/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          body,
          imageUrl: imageUrl || undefined,
          testEmail,
        }),
      });
      const data = (await res.json()) as SendResult;
      setResult(data);
      setStatus(res.ok ? "success" : "error");
    } catch {
      setStatus("error");
    }
  }

  const adminEmail = session?.user?.email ?? "";
  const canSend = subject.trim() && body.trim();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Send Newsletter</h1>
        <p className="mt-1 text-sm text-gray-500">
          {subscriberCount === null
            ? "Loading subscriber count…"
            : `${subscriberCount.toLocaleString()} confirmed subscriber${subscriberCount !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Result banner */}
      {status === "success" && result && (
        <div
          className={`mb-6 rounded-xl border p-4 text-sm ${result.noSubscribers ? "bg-yellow-50 border-yellow-200 text-yellow-800" : "bg-green-50 border-green-200 text-green-800"}`}
        >
          {result.noSubscribers
            ? "⚠️ No confirmed subscribers yet. Use the test button to preview the email in your inbox first."
            : result.test
              ? `✅ Test email sent to ${adminEmail}`
              : `✅ Sent to ${result.sent} subscriber${result.sent !== 1 ? "s" : ""}${result.failed > 0 ? ` · ${result.failed} failed` : ""}`}
        </div>
      )}
      {status === "error" && (
        <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-800">
          Something went wrong. Please try again.
        </div>
      )}

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-5">
        {/* Subject */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Subject <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. New arrivals just dropped!"
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-red-400 focus:outline-none"
          />
        </div>

        {/* Image */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Image <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://... or upload below"
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-red-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60 transition whitespace-nowrap"
            >
              {uploading ? "Uploading…" : "Upload"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>
          {imageUrl && (
            <div className="mt-2 relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="Preview"
                className="w-full rounded-lg object-cover max-h-48 border border-gray-100"
              />
              <button
                onClick={() => setImageUrl("")}
                className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black transition"
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Body */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Message <span className="text-red-500">*</span>
          </label>
          <p className="mb-1.5 text-xs text-gray-400">
            Plain text. Blank lines = new paragraph. A &quot;Shop Now&quot; button is added
            automatically at the bottom.
          </p>
          <textarea
            rows={10}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={"Hey collectors,\n\nWe just added some amazing new cards to the shop..."}
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-red-400 focus:outline-none resize-y"
          />
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
          {/* Test email */}
          {adminEmail && (
            <button
              onClick={() => send(adminEmail)}
              disabled={!canSend || status === "loading"}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition"
            >
              Send test to me
            </button>
          )}

          {/* Send to all */}
          {confirm ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700 font-medium">
                Send to {subscriberCount ?? "all"} subscriber{subscriberCount !== 1 ? "s" : ""}?
              </span>
              <button
                onClick={() => send()}
                disabled={status === "loading"}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition"
              >
                {status === "loading" ? "Sending…" : "Yes, send"}
              </button>
              <button
                onClick={() => setConfirm(false)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setConfirm(true);
                setResult(null);
                setStatus("idle");
              }}
              disabled={!canSend || status === "loading"}
              className="rounded-lg bg-gray-900 px-6 py-2 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-40 transition"
            >
              Send to All Subscribers
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
