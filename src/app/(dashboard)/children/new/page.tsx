"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewChildPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      const res = await fetch("/api/children", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error ?? "Failed to create child");
        return;
      }

      router.push(`/children/${result.data.id}`);
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add Child</h1>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label
              htmlFor="first_name"
              className="block text-sm font-medium text-gray-900"
            >
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="first_name"
              id="first_name"
              required
              maxLength={100}
              className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            />
          </div>

          <div>
            <label
              htmlFor="middle_name"
              className="block text-sm font-medium text-gray-900"
            >
              Middle Name
            </label>
            <input
              type="text"
              name="middle_name"
              id="middle_name"
              maxLength={100}
              className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            />
          </div>

          <div>
            <label
              htmlFor="last_name"
              className="block text-sm font-medium text-gray-900"
            >
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="last_name"
              id="last_name"
              required
              maxLength={100}
              className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            />
          </div>

          <div>
            <label
              htmlFor="preferred_name"
              className="block text-sm font-medium text-gray-900"
            >
              Preferred Name
            </label>
            <input
              type="text"
              name="preferred_name"
              id="preferred_name"
              maxLength={100}
              className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            />
          </div>

          <div>
            <label
              htmlFor="date_of_birth"
              className="block text-sm font-medium text-gray-900"
            >
              Date of Birth <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="date_of_birth"
              id="date_of_birth"
              required
              className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            />
          </div>

          <div>
            <label
              htmlFor="gender"
              className="block text-sm font-medium text-gray-900"
            >
              Gender <span className="text-red-500">*</span>
            </label>
            <select
              name="gender"
              id="gender"
              required
              className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="undisclosed">Undisclosed</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="nationality"
              className="block text-sm font-medium text-gray-900"
            >
              Nationality
            </label>
            <input
              type="text"
              name="nationality"
              id="nationality"
              maxLength={100}
              className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            />
          </div>

          <div>
            <label
              htmlFor="admission_date"
              className="block text-sm font-medium text-gray-900"
            >
              Admission Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="admission_date"
              id="admission_date"
              required
              className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Child"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
