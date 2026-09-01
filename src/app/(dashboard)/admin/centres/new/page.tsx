"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewCentrePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/platform/centres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          code: form.get("code"),
          contact_email: form.get("contact_email"),
          contact_phone: form.get("contact_phone"),
          address_line1: form.get("address_line1"),
          city: form.get("city"),
          country: form.get("country"),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to create centre.");
        return;
      }

      router.push("/admin/centres");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Create New Centre</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg bg-white p-6 shadow-sm border">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Centre Name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            name="name"
            required
            className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
          />
        </div>

        <div>
          <label htmlFor="code" className="block text-sm font-medium text-gray-700">
            Centre Code <span className="text-red-500">*</span>
          </label>
          <input
            id="code"
            name="code"
            required
            placeholder="e.g. SUN-001"
            className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700">
              Contact Email
            </label>
            <input
              id="contact_email"
              name="contact_email"
              type="email"
              className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            />
          </div>
          <div>
            <label htmlFor="contact_phone" className="block text-sm font-medium text-gray-700">
              Contact Phone
            </label>
            <input
              id="contact_phone"
              name="contact_phone"
              className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            />
          </div>
        </div>

        <div>
          <label htmlFor="address_line1" className="block text-sm font-medium text-gray-700">
            Address
          </label>
          <input
            id="address_line1"
            name="address_line1"
            className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700">
              City
            </label>
            <input
              id="city"
              name="city"
              className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            />
          </div>
          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700">
              Country
            </label>
            <input
              id="country"
              name="country"
              defaultValue="Nigeria"
              className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Centre"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-md bg-white px-3.5 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
