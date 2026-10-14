"use client";

import { useEffect, useState } from "react";
import { resetUserPassword, type ResetPasswordState } from "@/lib/auth/account-recovery";

interface Account {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  status: string;
}

/**
 * Login accounts of the centre (username = email). The creator (manager) can
 * reset a staff member's password when they forget it: a one-time temporary
 * password is shown ONCE and shared out of band.
 */
export default function UserAccountsList() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResetPasswordState | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/staff/users?limit=200", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Failed to load accounts.");
      setAccounts(json.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load accounts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function reset(id: string, name: string) {
    if (
      typeof window !== "undefined" &&
      !window.confirm(`Reset the password for ${name}? They will receive a temporary password.`)
    ) {
      return;
    }
    setError(null);
    setResult(null);
    setBusyId(id);
    try {
      const out = await resetUserPassword(id);
      if (!out.ok) {
        setError(out.error ?? "Failed to reset.");
        return;
      }
      setResult(out);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <p className="text-sm text-zinc-500 mb-3">
        Each person&apos;s <span className="font-medium">username is their email address</span>.
        If someone forgets their password, reset it here and share the temporary
        password with them directly.
      </p>

      {error && (
        <div className="mb-3 rounded-md bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {result?.ok && (
        <div className="mb-3 rounded-md bg-green-50 border border-green-200 p-4">
          <p className="text-sm font-semibold text-green-900">
            Temporary password for {result.displayName} ({result.email})
          </p>
          <p className="mt-1 font-mono text-lg font-bold text-zinc-900 select-all">
            {result.tempPassword}
          </p>
          <p className="mt-1 text-xs text-green-800">
            Shown once — share it now (in person or by phone). Ask them to keep it safe.
          </p>
          <button
            onClick={() => setResult(null)}
            className="mt-2 text-xs font-semibold text-green-900 underline"
          >
            Hide
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-zinc-500">Loading accounts…</p>
      ) : accounts.length === 0 ? (
        <p className="text-sm text-zinc-500">No login accounts yet.</p>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
          {accounts.map((a) => (
            <li key={a.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-900 truncate">
                  {a.first_name} {a.last_name}
                </p>
                <p className="text-xs text-zinc-500 font-mono truncate">{a.email}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-zinc-400">{a.status}</span>
                <button
                  onClick={() => reset(a.id, `${a.first_name} ${a.last_name}`)}
                  disabled={busyId !== null}
                  className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-zinc-50 disabled:opacity-50"
                >
                  {busyId === a.id ? "…" : "Reset password"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
