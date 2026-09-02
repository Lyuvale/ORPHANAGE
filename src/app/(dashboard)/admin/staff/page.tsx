import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { getUserRoleName } from "@/lib/auth/authorization.service";
import RemoveStaffButton from "./RemoveStaffButton";

export const dynamic = "force-dynamic";

interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  centre_id: string;
  role_name: string;
}

interface StaffRow {
  user_id: string;
  centre_id: string;
  status: string;
  profile: {
    first_name: string;
    last_name: string;
    email: string | null;
  } | null;
  role: {
    name: string;
    is_system: boolean;
  } | null;
}

export default async function AdminStaffPage() {
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

  const admin = createAdminClient();

  // Load all active centres
  const { data: centresData } = await admin
    .from("centres")
    .select("id, name, code, status")
    .order("name");

  const centres = (centresData ?? []) as { id: string; name: string; code: string | null; status: string }[];

  // Load all user roles with profiles and roles (only centre roles — excludes platform admin & system roles)
  const { data: rolesData, error } = await admin
    .from("user_roles")
    .select(`
      user_id, centre_id, status,
      role:roles!role_id (name, is_system)
    `)
    .eq("status", "active");

  const roleRows = (rolesData ?? []) as unknown as StaffRow[];

  // Build staff members list (exclude platform/system roles like PLATFORM_ADMINISTRATOR)
  const staff: StaffMember[] = [];
  const seen = new Set<string>();
  for (const row of roleRows) {
    if (row.role?.is_system) continue;
    const key = `${row.user_id}|${row.centre_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const profile = row.profile ?? null;
    staff.push({
      id: row.user_id,
      first_name: profile?.first_name ?? "",
      last_name: profile?.last_name ?? "",
      email: profile?.email ?? null,
      centre_id: row.centre_id,
      role_name: row.role?.name ?? "Unknown",
    });
  }

  // Group by centre
  const byCentre = new Map<string, StaffMember[]>();
  for (const m of staff) {
    const list = byCentre.get(m.centre_id) ?? [];
    list.push(m);
    byCentre.set(m.centre_id, list);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Staff Summary</h1>
        <Link href="/admin" className="rounded-md bg-white border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Back to Dashboard
        </Link>
      </div>

      <nav className="flex flex-wrap gap-2">
        <Link href="/admin" className="rounded-md bg-white border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Overview</Link>
        <Link href="/admin/centres" className="rounded-md bg-white border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Centres</Link>
        <Link href="/admin/staff" className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white">Staff</Link>
        <Link href="/admin/subscriptions" className="rounded-md bg-white border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Subscriptions</Link>
        <Link href="/admin/payments" className="rounded-md bg-white border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Payments</Link>
      </nav>

      {/* Summary stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total Staff</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{staff.length}</p>
          <p className="text-xs text-gray-400">all active roles</p>
        </div>
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Centres with Staff</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{byCentre.size}</p>
          <p className="text-xs text-gray-400">of {centres.length} active</p>
        </div>
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Managers</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {staff.filter((s) => s.role_name === "CENTRE_MANAGER").length}
          </p>
          <p className="text-xs text-gray-400">centres assigned a manager</p>
        </div>
      </div>

      {/* Per-centre breakdown */}
      {centres.length === 0 ? (
        <p className="text-sm text-gray-500">No centres found.</p>
      ) : (
        <div className="space-y-4">
          {centres.map((c) => {
            const centreStaff = byCentre.get(c.id) ?? [];
            return (
              <div key={c.id} className="rounded-xl border bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">
                      {c.name} <span className="ml-1 text-xs text-gray-400">({c.code})</span>
                    </h2>
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                    }`}>
                      {c.status === "active" ? "Active" : "Deactivated"}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{centreStaff.length}</p>
                    <p className="text-xs text-gray-400">staff</p>
                  </div>
                </div>
                {centreStaff.length === 0 ? (
                  <p className="mt-3 text-sm text-gray-500">No staff assigned to this centre yet.</p>
                ) : (
                  <div className="mt-3 overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-xs font-medium text-gray-500 uppercase">
                          <th className="px-3 py-2">Name</th>
                          <th className="px-3 py-2">Email</th>
                          <th className="px-3 py-2">Role</th>
                          <th className="px-3 py-2">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {centreStaff.map((m) => (
                          <tr key={m.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-medium text-gray-900">
                              {[m.first_name, m.last_name].filter(Boolean).join(" ") || "—"}
                            </td>
                            <td className="px-3 py-2 text-gray-500">{m.email ?? "—"}</td>
                            <td className="px-3 py-2">
                              <span className="inline-block rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                                {m.role_name}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <RemoveStaffButton userId={m.id} centreId={m.centre_id} roleName={m.role_name} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
