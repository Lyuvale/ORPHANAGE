import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { getUserRoleName, can } from "@/lib/auth/authorization.service";
import CentreToggle from "./CentreToggle";

interface CentreRecord {
  id: string;
  name: string;
  code: string | null;
  status: string;
  created_at: string;
}

async function loadCentres(): Promise<CentreRecord[]> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  try {
    const res = await fetch(`${baseUrl}/api/platform/centres`, { cache: "no-store" });
    if (!res.ok) return [];
    return (await res.json()).data ?? [];
  } catch {
    return [];
  }
}

export default async function AdminCentresPage() {
  const supabase = await createClient();
  const ctx = await requireAppAccess(supabase as never, {
    allowInactiveSubscription: true,
  });

  const roleName = await getUserRoleName(supabase as never, ctx);
  const canView = await can(supabase as never, ctx, "platform.centres");

  if (roleName !== "PLATFORM_ADMINISTRATOR" || !canView) {
    redirect("/children");
  }

  const centres = await loadCentres();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Platform Centres</h1>
      <nav className="flex flex-wrap gap-2">
        <Link
          href="/admin"
          className="rounded-md bg-white border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Overview
        </Link>
        <Link
          href="/admin/centres"
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white"
        >
          Centres
        </Link>
        <Link
          href="/admin/payments"
          className="rounded-md bg-white border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Payments
        </Link>
        <Link
          href="/admin/settings"
          className="rounded-md bg-white border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Settings
        </Link>
      </nav>

      {centres.length === 0 ? (
        <p className="text-sm text-gray-500">No centres found.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-white shadow-sm border">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {centres.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-2 font-medium text-gray-900">{c.name}</td>
                  <td className="px-4 py-2 text-gray-700">{c.code ?? "—"}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {c.status === "active" ? "Active" : "Deactivated"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-500">
                    {new Date(c.created_at).toLocaleDateString("en-GB")}
                  </td>
                  <td className="px-4 py-2">
                    <CentreToggle centreId={c.id} isActive={c.status === "active"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}