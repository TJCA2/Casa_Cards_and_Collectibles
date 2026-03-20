"use client";

import { useState, useRef } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { useSearchParams } from "next/navigation";

const TURNSTILE_TEST_SITEKEY = "1x00000000000000000000AA";

const SUBJECTS = [
  { value: "General Question", label: "General Question" },
  { value: "Order Issue", label: "Order Issue" },
  { value: "Product Inquiry", label: "Product Inquiry" },
  { value: "Other", label: "Other" },
];

interface Prefill {
  name: string;
  email: string;
  isLoggedIn: boolean;
}

interface Props {
  prefill: Prefill;
}

export default function ContactForm({ prefill }: Props) {
  const searchParams = useSearchParams();
  const productId = searchParams.get("productId");
  const productName = searchParams.get("productName");

  const [name, setName] = useState(prefill.name);
  const [email, setEmail] = useState(prefill.email);
  const [subject, setSubject] = useState(productName ? "Product Inquiry" : "General Question");
  const [body, setBody] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaError, setCaptchaError] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const turnstileRef = useRef<TurnstileInstance>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? TURNSTILE_TEST_SITEKEY;

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Name is required.";
    else if (name.length > 100) errs.name = "Name must be 100 characters or fewer.";
    if (!email.trim()) errs.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Enter a valid email address.";
    if (!body.trim()) errs.body = "Message is required.";
    else if (body.trim().length < 10) errs.body = "Message must be at least 10 characters.";
    else if (body.length > 2000) errs.body = "Message must be 2000 characters or fewer.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate()) return;

    setStatus("loading");
    setErrorMsg("");

    const formData = new FormData(e.currentTarget);
    const honeypot = formData.get("website") as string;

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          subject,
          body: body.trim(),
          ...(productId ? { productId } : {}),
          ...(honeypot !== undefined ? { website: honeypot } : {}),
          ...(!prefill.isLoggedIn ? { turnstileToken: captchaToken } : {}),
        }),
      });

      if (res.ok) {
        setStatus("success");
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (res.status === 422 && data.field) {
        setErrors({ [data.field]: data.error });
        setStatus("idle");
      } else if (res.status === 429) {
        setErrorMsg("Too many messages. Please wait a while before trying again.");
        setStatus("error");
      } else if (res.status === 400 && data.error) {
        setErrorMsg(data.error);
        setStatus("error");
      } else {
        setErrorMsg("Something went wrong. Please try again.");
        setStatus("error");
      }

      if (!prefill.isLoggedIn) {
        turnstileRef.current?.reset();
        setCaptchaToken("");
      }
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-7 w-7 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-lg font-semibold text-gray-900">Message sent!</p>
        <p className="mt-1 text-sm text-gray-500">
          We&apos;ll reply to <strong>{email}</strong> within 1–2 business days.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* Product chip */}
      {productName && (
        <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5">
          <svg
            className="h-4 w-4 flex-shrink-0 text-blue-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-sm text-blue-700">
            About: <strong>{decodeURIComponent(productName)}</strong>
          </span>
        </div>
      )}

      {/* Honeypot — hidden from real users */}
      <input
        type="text"
        name="website"
        defaultValue=""
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] opacity-0"
      />

      {/* Name */}
      <div>
        <label htmlFor="cf-name" className="mb-1 block text-sm font-medium text-gray-700">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          id="cf-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          readOnly={prefill.isLoggedIn && !!prefill.name}
          maxLength={100}
          placeholder="Your name"
          className={`w-full rounded-xl border px-4 py-2.5 text-sm transition-colors focus:outline-none ${
            prefill.isLoggedIn && !!prefill.name
              ? "border-gray-200 bg-gray-50 text-gray-500"
              : errors.name
                ? "border-red-300 bg-red-50 focus:border-red-400"
                : "border-gray-300 bg-white focus:border-red-500"
          }`}
        />
        {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
      </div>

      {/* Email */}
      <div>
        <label htmlFor="cf-email" className="mb-1 block text-sm font-medium text-gray-700">
          Email <span className="text-red-500">*</span>
        </label>
        <input
          id="cf-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          readOnly={prefill.isLoggedIn}
          maxLength={254}
          placeholder="you@example.com"
          className={`w-full rounded-xl border px-4 py-2.5 text-sm transition-colors focus:outline-none ${
            prefill.isLoggedIn
              ? "border-gray-200 bg-gray-50 text-gray-500"
              : errors.email
                ? "border-red-300 bg-red-50 focus:border-red-400"
                : "border-gray-300 bg-white focus:border-red-500"
          }`}
        />
        {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
      </div>

      {/* Subject */}
      <div>
        <label htmlFor="cf-subject" className="mb-1 block text-sm font-medium text-gray-700">
          Subject <span className="text-red-500">*</span>
        </label>
        <select
          id="cf-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-red-500 focus:outline-none"
        >
          {SUBJECTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Message */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label htmlFor="cf-body" className="block text-sm font-medium text-gray-700">
            Message <span className="text-red-500">*</span>
          </label>
          <span className={`text-xs ${body.length > 1900 ? "text-red-500" : "text-gray-400"}`}>
            {body.length}/2000
          </span>
        </div>
        <textarea
          id="cf-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          maxLength={2000}
          placeholder="How can we help you?"
          className={`w-full resize-y rounded-xl border px-4 py-2.5 text-sm transition-colors focus:outline-none ${
            errors.body
              ? "border-red-300 bg-red-50 focus:border-red-400"
              : "border-gray-300 bg-white focus:border-red-500"
          }`}
        />
        {errors.body && <p className="mt-1 text-xs text-red-600">{errors.body}</p>}
      </div>

      {/* Turnstile — guests only */}
      {!prefill.isLoggedIn && (
        <div>
          {captchaError ? (
            <p className="text-sm text-red-600">
              CAPTCHA failed.{" "}
              <button
                type="button"
                onClick={() => {
                  turnstileRef.current?.reset();
                  setCaptchaError(false);
                }}
                className="underline"
              >
                Click here to retry.
              </button>
            </p>
          ) : (
            <Turnstile
              ref={turnstileRef}
              siteKey={siteKey}
              options={{ appearance: "always" }}
              onSuccess={(token) => {
                setCaptchaToken(token);
                setCaptchaError(false);
              }}
              onExpire={() => setCaptchaToken("")}
              onError={() => {
                setCaptchaToken("");
                setCaptchaError(true);
              }}
            />
          )}
        </div>
      )}

      {/* Generic error */}
      {status === "error" && errorMsg && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {errorMsg}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "loading" || (!prefill.isLoggedIn && !captchaToken)}
        className="w-full rounded-xl bg-red-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "loading" ? "Sending…" : "Send Message"}
      </button>
    </form>
  );
}
