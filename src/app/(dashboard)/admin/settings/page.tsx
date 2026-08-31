import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { getUserRoleName, can } from "@/lib/auth/authorization.service";
import SettingsClient from "./SettingsClient";

interface SettingsData {
  settings: { key: string; value: unknown }[];
  online_contribution_centres: {
    centre_id: string;
    enabled: boolean;
    purpose_presets: string[];
  }[];
}

async function loadSettings(): Promise<SettingsData | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  try {
    const res = await fetch(`${baseUrl}/api/platform/settings`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()).data as SettingsData;
  } catch {
    return null;
  }
}

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const ctx = await requireAppAccess(supabase as never, {
    allowInactiveSubscription: true,
  });

  const roleName = await getUserRoleName(supabase as never, ctx);
  const canView = await can(supabase as never, ctx, "platform.settings");

  if (roleName !== "PLATFORM_ADMINISTRATOR" || !canView) {
    redirect("/children");
  }

  const data = await loadSettings();

  const masterEnabled =
    data?.settings.find((s) => s.key === "online_contributions_enabled")?.value === true;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Platform Settings</h1>
      <nav className="flex flex-wrap gap-2">
        <Link
          href="/admin"
          className="rounded-md bg-white border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Overview
        </Link>
        <Link
          href="/admin/centres"
          className="rounded-md bg-white border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
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
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white"
        >
          Settings
        </Link>
      </nav>

      {!data ? (
        <p className="text-sm text-gray-500">Settings unavailable right now.</p>
      ) : (
        <div className="space-y-6">
          <div className="rounded-lg bg-white p-5 shadow-sm border">
            <h2 className="text-sm font-medium text-gray-900">Online contributions</h2>
            <p className="mt-1 text-sm text-gray-500">
              Master switch for public support-a-centre donation pages.
            </p>
            <div className="mt-3">
              <SettingsClient masterEnabled={masterEnabled} />
            </div>
          </div>

          <div className="rounded-lg bg-white p-5 shadow-sm border">
            <h2 className="text-sm font-medium text-gray-900 mb-3">
              Centres accepting online contributions ({data.online_contribution_centres.length})
            </h2>
            {data.online_contribution_centres.length === 0 ? (
              <p className="text-sm text-gray-500">
                No centres have been configured yet.
              </p>
            ) : (
              <ul className="divide-y">
                {data.online_contribution_centres.map((c) => (
                  <li key={c.centre_id} className="py-2 text-sm">
                    <span className="font-medium text-gray-800">{c.centre_id}</span>
                    <span className="ml-2 text-gray-500">
                      purposes: {(c.purpose_presets ?? []).join(", ")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}