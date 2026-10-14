"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export function AssignManagerForm({
  centreId,
  users,
  currentManager,
}: {
  centreId: string;
  users: Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
  }>;
  currentManager: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
  } | null;
}) {
  const router = useRouter();
  const [selectedUserId, setSelectedUserId] = useState<string>(currentManager?.id ?? users[0]?.id ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? null,
    [selectedUserId, users],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedUserId) {
      setError("Please choose a staff member first.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/centres/${centreId}/manager`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userProfileId: selectedUserId }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || "Could not assign the centre manager.");
      }

      setSuccess("Centre manager assigned successfully.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not assign the centre manager.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Centre manager</h3>
        <p className="mt-1 text-sm text-gray-500">
          Choose a staff member already attached to this centre and assign them as manager.
        </p>
      </div>

      <div>
        <label htmlFor="manager-user" className="mb-2 block text-sm font-medium text-gray-700">
          Staff member
        </label>
        <select
          id="manager-user"
          value={selectedUserId}
          onChange={(event) => setSelectedUserId(event.target.value)}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="">Select a staff member</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.first_name} {user.last_name}
              {user.email ? ` — ${user.email}` : ""}
            </option>
          ))}
        </select>
      </div>

      {selectedUser && (
        <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
          <p className="font-medium text-gray-900">Selected staff member</p>
          <p>
            {selectedUser.first_name} {selectedUser.last_name}
          </p>
          <p className="text-gray-500">{selectedUser.email ?? selectedUser.phone ?? "No contact details"}</p>
        </div>
      )}

      {currentManager && (
        <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Current manager: {currentManager.first_name} {currentManager.last_name}
        </div>
      )}

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
      {success && <p className="text-sm font-medium text-green-600">{success}</p>}

      <button
        type="submit"
        disabled={submitting || !selectedUserId}
        className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
      >
        {submitting ? "Assigning..." : "Assign as Centre Manager"}
      </button>
    </form>
  );
}
