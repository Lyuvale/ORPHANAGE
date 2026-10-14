"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { provisionUser, type ProvisionUserState } from "@/lib/auth/auth-actions";

type Role = {
  id: string;
  name: string;
  is_system: boolean;
  centre_id: string | null;
};

const SYSTEM_ROLES = [
  "SOCIAL_WORKER",
  "CAREGIVER",
  "RECORDS_OFFICER",
  "ACCOUNTANT_BURSAR",
  "CENTRE_IT",
] as const;

function roleLabel(role: string): string {
  return role.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function TeamForm() {
  const [customRoles, setCustomRoles] = useState<Role[]>([]);
  const [state, formAction, pending] = useActionState<ProvisionUserState | null, FormData>(
    provisionUser,
    null,
  );

  useEffect(() => {
    fetch("/api/roles")
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          // Filter: custom roles only (is_system = false) for this centre
          setCustomRoles(
            (json.data as Role[]).filter((r) => !r.is_system)
          );
        }
      })
      .catch(() => {});
  }, []);

  const allRoles = [
    ...SYSTEM_ROLES,
    ...customRoles.map((r) => r.name),
  ];

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-zinc-700">
            First name
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            required
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
        </div>
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-zinc-700">
            Last name
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            required
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-zinc-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          placeholder="staff@example.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-zinc-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          placeholder="At least 10 chars (letters + numbers)"
        />
      </div>

      <div>
        <label htmlFor="role" className="block text-sm font-medium text-zinc-700">
          Role
        </label>
        <select
          id="role"
          name="role"
          required
          className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        >
          <option value="">Select a role…</option>
          {allRoles.map((r) => (
            <option key={r} value={r}>
              {roleLabel(r)}
              {!SYSTEM_ROLES.includes(r as typeof SYSTEM_ROLES[number]) && (
                <span className="ml-2 text-xs text-zinc-400">(custom)</span>
              )}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-zinc-500">
          Centre manager accounts are created by the platform administrator.
        </p>
      </div>

      {state && !state.ok ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : state && state.ok ? (
        <p className="text-sm text-green-600" role="status">
          Account created. The user can now sign in.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || (state !== null && state.ok)}
        className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60"
      >
        {pending ? "Creating account…" : "Create account"}
      </button>

      <p className="text-sm text-center text-zinc-600">
        Back to{" "}
        <Link href="/children" className="text-zinc-600 hover:text-zinc-900 underline">
          dashboard
        </Link>
      </p>
    </form>
  );
}