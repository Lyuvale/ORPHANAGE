"use client";

import { useState } from "react";
import { resetUserPasswordByEmail, type ResetPasswordState } from "@/lib/auth/account-recovery";

/** Platform admin: find any account by email and reset its password. */
export default function AdminPasswordReset() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResetPasswordState | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!email.trim()) {
      setError("Please enter an email address.");
      return;
    }
    if (
      typeof window !== "undefined" &&
      !window.confirm(`Reset the password for ${email.trim()}?`)
    ) {
      return;
    }
    setBusy(true);
    try {
      const out = await resetUserPasswordByEmail(email);
      if (!out.ok) {
        setError(out.error ?? "Failed to reset.");
        return;
      }
      setResult(out);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-zinc-900">Password help</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Find any account by email (its username) and reset its password. The
        temporary password is shown once — share it directly.
      </p>
      <form onSubmit={submit} className="mt-3 flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
          className="w-full max-w-sm border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {busy ? "…" : "Reset password"}
        </button>
      </form>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {result?.ok && (
        <div className="mt-3 rounded-md bg-green-50 border border-green-200 p-4">
          <p className="text-sm font-semibold text-green-900">
            Temporary password for {result.displayName} ({result.email})
          </p>
          <p className="mt-1 font-mono text-lg font-bold text-zinc-900 select-all">
            {result.tempPassword}
          </p>
          <button
            onClick={() => setResult(null)}
            className="mt-2 text-xs font-semibold text-green-900 underline"
          >
            Hide
          </button>
        </div>
      )}
    </div>
  );
}
