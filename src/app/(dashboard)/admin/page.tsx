import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { getUserRoleName } from "@/lib/auth/authorization.service";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = (await createClient()) as never;
  let ctx;
  try {
    ctx = await requireAppAccess(supabase, { allowInactiveSubscription: true });
  } catch {
    redirect("/login");
  }

  const roleName = await getUserRoleName(supabase, ctx);
  if (roleName !== "PLATFORM_ADMINISTRATOR") {
    redirect("/children");
  }

  // Direct query — no internal fetch, no RLS issues
  const admin = createAdminClient();

  const [centreRes, activeCentreRes, subRes, activeSubRes] = await Promise.all([
    admin.from("centres").select("id", { count: "exact", head: true }),
    admin.from("centres").select("id", { count: "exact", head: true }).eq("status", "active"),
    admin.from("subscriptions").select("id", { count: "exact", head: true }),
    admin.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
  ]);

  const { count: paymentCount } = await admin
    .from("payment_transactions")
    .select("id", { count: "exact", head: true });

  const stats = [
    { label: "Centres", value: centreRes.count ?? 0 },
    { label: "Active Centres", value: activeCentreRes.count ?? 0 },
    { label: "Subscriptions", value: subRes.count ?? 0 },
    { label: "Active Subscriptions", value: activeSubRes.count ?? 0 },
    { label: "Payments", value: paymentCount ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Platform Administration</h1>
        <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
          PLATFORM ADMINISTRATOR
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg bg-white p-5 shadow-sm border">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
