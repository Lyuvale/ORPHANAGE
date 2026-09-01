import { redirect } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

async function createCentre(formData: FormData) {
  "use server";

  const name = (formData.get("name") as string)?.trim();
  const code = (formData.get("code") as string)?.trim();
  const contact_email = (formData.get("contact_email") as string)?.trim() || null;
  const contact_phone = (formData.get("contact_phone") as string)?.trim() || null;
  const address_line1 = (formData.get("address_line1") as string)?.trim() || null;
  const city = (formData.get("city") as string)?.trim() || null;
  const state = (formData.get("state") as string)?.trim() || null;
  const country = (formData.get("country") as string)?.trim() || null;

  if (!name || !code) {
    throw new Error("Centre name and code are required.");
  }

  const admin = createAdminClient();
  const { error } = await admin.from("centres").insert({
    name,
    code,
    contact_email,
    contact_phone,
    address_line1,
    city,
    state,
    country,
  });

  if (error) {
    if (error.code === "23505") {
      throw new Error("A centre with that code already exists.");
    }
    throw new Error(error.message || "Failed to create centre.");
  }

  redirect("/centres");
}

export default function NewCentrePage() {
  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Register New Centre</h2>

      <form action={createCentre} className="space-y-6 bg-white p-6 rounded-lg border">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Centre Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="code" className="block text-sm font-medium text-gray-700">
            Centre Code *
          </label>
          <input
            type="text"
            id="code"
            name="code"
            required
            pattern="[A-Za-z0-9_-]+"
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Letters, numbers, hyphens, and underscores only. Must be unique.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700">
              Contact Email
            </label>
            <input
              type="email"
              id="contact_email"
              name="contact_email"
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="contact_phone" className="block text-sm font-medium text-gray-700">
              Contact Phone
            </label>
            <input
              type="tel"
              id="contact_phone"
              name="contact_phone"
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label htmlFor="address_line1" className="block text-sm font-medium text-gray-700">
            Address
          </label>
          <input
            type="text"
            id="address_line1"
            name="address_line1"
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700">
              City
            </label>
            <input
              type="text"
              id="city"
              name="city"
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="state" className="block text-sm font-medium text-gray-700">
              State
            </label>
            <input
              type="text"
              id="state"
              name="state"
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700">
              Country
            </label>
            <input
              type="text"
              id="country"
              name="country"
              defaultValue="Nigeria"
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Link
            href="/centres"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Create Centre
          </button>
        </div>
      </form>
    </div>
  );
}
