"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface ProfileRow {
  id: string;
}

interface UserRoleRow {
  role: { name: string } | null;
}

interface SingleRowQuery<T> {
  maybeSingle(): Promise<{ data: T | null }>;
  single(): Promise<{ data: T }>;
  eq(column: string, value: string): this;
}

interface LooseClient {
  from<T>(table: string): {
    select(columns: string): SingleRowQuery<T>;
  };
}

const looseClient = (client: unknown) => client as LooseClient;

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        setError(
          error.message === "Invalid login credentials"
            ? "Incorrect email or password."
            : error.message,
        );
        setLoading(false);
        return;
      }

      const user = data.user;
      if (!user) {
        setError("Sign in failed. Please try again.");
        setLoading(false);
        return;
      }

      // Resolve the user's active role to route them to the right landing page.
      let roleName: string | null = null;
      const client = looseClient(supabase);
      const { data: profile } = await client
        .from<ProfileRow>("user_profiles")
        .select("id")
        .eq("auth_user_id", user.id)
        .single();

      if (profile) {
        const { data: userRole } = await client
          .from<UserRoleRow>("user_roles")
          .select("role:roles(name)")
          .eq("user_id", profile.id)
          .eq("status", "active")
          .maybeSingle();
        roleName = userRole?.role?.name ?? null;
      }

      const landing =
        roleName === "PLATFORM_ADMINISTRATOR" ? "/admin" : "/centres";
      router.push(landing);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
          placeholder="••••••••"
        />
      </div>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
