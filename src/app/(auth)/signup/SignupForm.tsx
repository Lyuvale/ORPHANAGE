"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp, type SignUpState } from "@/lib/auth/auth-actions";
import { CENTRE_ROLES } from "@/types/role";

export interface SignupCentreOption {
  id: string;
  name: string;
}

export default function SignupForm({ centres }: { centres: SignupCentreOption[] }) {
  const [state, formAction, pending] = useActionState<SignUpState | null, FormData>(
    signUp,
    null,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
            First name
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
            Last name
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
          placeholder="At least 8 characters"
        />
      </div>

      <div>
        <label htmlFor="centreId" className="block text-sm font-medium text-gray-700">
          Centre
        </label>
        <select
          id="centreId"
          name="centreId"
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
        >
          <option value="">Select a centre…</option>
          {centres.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="role" className="block text-sm font-medium text-gray-700">
          Role
        </label>
        <select
          id="role"
          name="role"
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
        >
          <option value="">Select a role…</option>
          {CENTRE_ROLES.map((r) => (
            <option key={r} value={r}>
              {r.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          Platform administrator accounts are granted by an existing administrator.
        </p>
      </div>

      {state && !state.ok ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : state && state.ok ? (
        <p className="text-sm text-green-600" role="status">
          Account created. Please sign in with your new credentials.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || (state !== null && state.ok)}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Creating account…" : "Create account"}
      </button>

      <p className="text-sm text-center text-gray-600">
        Already have an account?{" "}
        <Link href="/login" className="text-blue-600 hover:text-blue-800">
          Sign in
        </Link>
      </p>
    </form>
  );
}
