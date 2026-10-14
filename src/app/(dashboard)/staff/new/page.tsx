"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { STAFF_STATUSES, getStaffStatusDisplay } from "@/types/staff";
import { CENTRE_ROLES } from "@/types/role";

interface UserOption {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export default function NewStaffPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/staff/users?limit=200");
      if (!res.ok) return;
      const data = await res.json();
      setUsers(data.data ?? []);
    } catch {
      // user linking is optional; ignore load failures
    }
  }, []);

  useEffect(() => {
    // Staff profiles are created by the Centre Manager (staff.create).
    // Anyone without it is sent back to the Team hub (API enforces too).
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { permissions: [] }))
      .then((j) => {
        const perms: string[] = Array.isArray(j.permissions) ? j.permissions : [];
        if (!perms.includes("staff.create")) {
          router.replace("/team");
        }
      })
      .catch(() => {});
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadUsers]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    if (data.user_profile_id === "") delete data.user_profile_id;
    if (data.operational_role === "") delete data.operational_role;
    if (data.employment_status === "") delete data.employment_status;

    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error ?? "Failed to create staff profile");
        return;
      }

      router.push(`/staff/${result.data.id}`);
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "mt-1 block w-full rounded-md border-0 py-1.5 text-zinc-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6";

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-zinc-900 mb-6">Add Staff</h1>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="job_title" className="block text-sm font-medium text-zinc-900">
              Job Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="job_title"
              id="job_title"
              required
              maxLength={200}
              placeholder="e.g. Senior Caregiver"
              className={inputCls}
            />
          </div>

          <div>
            <label htmlFor="department" className="block text-sm font-medium text-zinc-900">
              Department / Unit
            </label>
            <input
              type="text"
              name="department"
              id="department"
              maxLength={200}
              className={inputCls}
            />
          </div>

          <div>
            <label htmlFor="staff_identifier" className="block text-sm font-medium text-zinc-900">
              Staff Identifier
            </label>
            <input
              type="text"
              name="staff_identifier"
              id="staff_identifier"
              maxLength={100}
              placeholder="e.g. STF-0001"
              className={inputCls}
            />
          </div>

          <div>
            <label htmlFor="operational_role" className="block text-sm font-medium text-zinc-900">
              Operational Role
            </label>
            <select name="operational_role" id="operational_role" className={inputCls}>
              <option value="">Select role</option>
              {CENTRE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="employment_status" className="block text-sm font-medium text-zinc-900">
              Employment Status
            </label>
            <select name="employment_status" id="employment_status" className={inputCls}>
              {STAFF_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {getStaffStatusDisplay(s)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="user_profile_id" className="block text-sm font-medium text-zinc-900">
              Link to Platform User
            </label>
            <select name="user_profile_id" id="user_profile_id" className={inputCls}>
              <option value="">No linked user</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.first_name} {u.last_name} ({u.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="start_date" className="block text-sm font-medium text-zinc-900">
              Start Date
            </label>
            <input type="date" name="start_date" id="start_date" className={inputCls} />
          </div>

          <div>
            <label htmlFor="end_date" className="block text-sm font-medium text-zinc-900">
              End Date
            </label>
            <input type="date" name="end_date" id="end_date" className={inputCls} />
          </div>

          <div>
            <label htmlFor="work_phone" className="block text-sm font-medium text-zinc-900">
              Work Phone
            </label>
            <input
              type="text"
              name="work_phone"
              id="work_phone"
              maxLength={50}
              className={inputCls}
            />
          </div>

          <div>
            <label htmlFor="work_email" className="block text-sm font-medium text-zinc-900">
              Work Email
            </label>
            <input
              type="email"
              name="work_email"
              id="work_email"
              maxLength={200}
              className={inputCls}
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="notes" className="block text-sm font-medium text-zinc-900">
              Notes
            </label>
            <textarea
              name="notes"
              id="notes"
              rows={3}
              maxLength={2000}
              className={inputCls}
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Staff"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/staff")}
            className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-zinc-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-zinc-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}