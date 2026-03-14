"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";

interface Props {
  user: {
    email: string;
    name: string | null;
    phone: string | null;
    pendingEmail: string | null;
  };
  emailChangedSuccess?: boolean;
}

export default function ProfileForm({ user, emailChangedSuccess }: Props) {
  // ── Profile (name + phone) ─────────────────────────────────────────────────
  const [name, setName] = useState(user.name ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || null, phone: phone.trim() || null }),
      });
      if (res.ok) {
        setSaveMsg({ ok: true, text: "Changes saved." });
      } else {
        const d = (await res.json()) as { error?: string };
        setSaveMsg({ ok: false, text: d.error ?? "Failed to save." });
      }
    } catch {
      setSaveMsg({ ok: false, text: "Network error. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  // ── Email change ───────────────────────────────────────────────────────────
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{ ok: boolean; text: string } | null>(
    emailChangedSuccess
      ? { ok: true, text: "Your email has been updated. Please sign in again." }
      : null,
  );

  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailSending(true);
    setEmailMsg(null);
    try {
      const res = await fetch("/api/account/change-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail: newEmail.trim() }),
      });
      const d = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok && d.ok) {
        setEmailMsg({
          ok: true,
          text: `Verification email sent to ${newEmail.trim()}. Click the link to confirm.`,
        });
        setShowEmailForm(false);
        setNewEmail("");
      } else {
        setEmailMsg({ ok: false, text: d.error ?? "Failed to send verification email." });
      }
    } catch {
      setEmailMsg({ ok: false, text: "Network error. Please try again." });
    } finally {
      setEmailSending(false);
    }
  }

  // ── Account deletion ───────────────────────────────────────────────────────
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    if (deleteInput !== "DELETE") return;
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (res.ok) {
        await signOut({ callbackUrl: "/" });
      } else {
        const d = (await res.json()) as { error?: string };
        setDeleteError(d.error ?? "Failed to delete account.");
      }
    } catch {
      setDeleteError("Network error. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  // ── Data export ────────────────────────────────────────────────────────────
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  async function handleExport() {
    setExporting(true);
    setExportError("");
    try {
      const res = await fetch("/api/account/export");
      if (res.status === 429) {
        setExportError("You can only export your data once per 24 hours.");
        return;
      }
      if (!res.ok) {
        setExportError("Export failed. Please try again.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `casa-cards-data-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setExportError("Network error. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-bold text-gray-900">Profile Settings</h2>

      {/* ── Name + Phone ── */}
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-base font-semibold text-gray-900">Personal Info</h3>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Display Name <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              placeholder="Your name"
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-red-400 focus:outline-none sm:max-w-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Phone <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={30}
              placeholder="+1 (555) 000-0000"
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-red-400 focus:outline-none sm:max-w-sm"
            />
          </div>

          {saveMsg && (
            <p className={`text-sm ${saveMsg.ok ? "text-green-600" : "text-red-600"}`}>
              {saveMsg.text}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </form>
      </section>

      {/* ── Email ── */}
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-base font-semibold text-gray-900">Email Address</h3>
        <p className="mb-1 text-sm text-gray-700 font-medium">{user.email}</p>
        {user.pendingEmail && (
          <p className="mb-3 text-xs text-amber-600">
            Pending change to <strong>{user.pendingEmail}</strong> — check your inbox to confirm.
          </p>
        )}

        {emailMsg && (
          <p className={`mb-3 text-sm ${emailMsg.ok ? "text-green-600" : "text-red-600"}`}>
            {emailMsg.text}
          </p>
        )}

        {!showEmailForm ? (
          <button
            onClick={() => {
              setShowEmailForm(true);
              setEmailMsg(null);
            }}
            className="text-sm font-medium text-red-600 hover:text-red-700"
          >
            Change email address →
          </button>
        ) : (
          <form onSubmit={handleChangeEmail} className="mt-3 space-y-3 sm:max-w-sm">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                New email address
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
                maxLength={254}
                autoFocus
                placeholder="new@example.com"
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-red-400 focus:outline-none"
              />
            </div>
            <p className="text-xs text-gray-500">
              A verification link will be sent to the new address. Your current email remains active
              until confirmed.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowEmailForm(false);
                  setNewEmail("");
                }}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:border-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={emailSending || !newEmail.trim()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {emailSending ? "Sending…" : "Send Verification"}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* ── Password ── */}
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="mb-2 text-base font-semibold text-gray-900">Password</h3>
        <p className="mb-3 text-sm text-gray-500">Change your account password.</p>
        <Link
          href="/account/profile/change-password"
          className="inline-block rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-300"
        >
          Change Password →
        </Link>
      </section>

      {/* ── GDPR: Data export ── */}
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="mb-2 text-base font-semibold text-gray-900">Your Data</h3>
        <p className="mb-3 text-sm text-gray-500">
          Download a copy of your personal data including orders, addresses, and profile info.
        </p>
        {exportError && <p className="mb-2 text-sm text-red-600">{exportError}</p>}
        <button
          onClick={handleExport}
          disabled={exporting}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-300 disabled:opacity-60"
        >
          {exporting ? "Preparing…" : "Download My Data"}
        </button>
      </section>

      {/* ── Sign out ── */}
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="mb-2 text-base font-semibold text-gray-900">Sign Out</h3>
        <p className="mb-3 text-sm text-gray-500">Sign out of your account on this device.</p>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-300"
        >
          Sign Out
        </button>
      </section>

      {/* ── Danger zone ── */}
      <section className="rounded-xl border border-red-200 bg-red-50 p-6">
        <h3 className="mb-2 text-base font-semibold text-red-800">Danger Zone</h3>
        <p className="mb-4 text-sm text-red-700">
          Permanently delete your account and all associated personal data. This cannot be undone.
          Order history is anonymized and retained for accounting purposes.
        </p>

        {!showDeleteForm ? (
          <button
            onClick={() => setShowDeleteForm(true)}
            className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
          >
            Delete My Account
          </button>
        ) : (
          <form onSubmit={handleDelete} className="space-y-3 sm:max-w-sm">
            <label className="block text-sm font-medium text-red-800">
              Type <strong>DELETE</strong> to confirm
            </label>
            <input
              type="text"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder="DELETE"
              autoFocus
              className="w-full rounded-lg border border-red-300 bg-white px-3 py-2.5 text-sm focus:border-red-500 focus:outline-none"
            />
            {deleteError && <p className="text-sm text-red-700">{deleteError}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteForm(false);
                  setDeleteInput("");
                }}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:border-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={deleteInput !== "DELETE" || deleting}
                className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Permanently Delete Account"}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
