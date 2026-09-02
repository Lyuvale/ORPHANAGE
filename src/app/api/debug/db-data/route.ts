import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = createAdminClient();

  const [centres, staff, children, subs, payments, plans] = await Promise.all([
    admin.from("centres").select("id, name, code, status"),
    admin.from("user_profiles").select("id, first_name, last_name, centre_id, status"),
    admin.from("children").select("id, first_name, last_name, centre_id, status"),
    admin.from("subscriptions").select("id, centre_id, plan_id, status, start_date, end_date"),
    admin.from("payment_transactions").select("id, centre_id, amount, currency, status, flow_type"),
    admin.from("plans").select("id, name, price, is_active"),
  ]);

  // user_roles with role names (separate queries — avoid flaky embedded joins)
  const { data: userRoles } = await admin
    .from("user_roles")
    .select("id, user_id, role_id, centre_id, status");
  const roleIds = [...new Set((userRoles ?? []).map((r) => r.role_id).filter(Boolean))];
  const { data: rolesData } = await admin.from("roles").select("id, name, is_system").in("id", roleIds);
  const roleMap = new Map<string, { name: string; is_system: boolean }>();
  for (const r of (rolesData ?? []) as { id: string; name: string; is_system: boolean }[]) {
    roleMap.set(r.id, { name: r.name, is_system: Boolean(r.is_system) });
  }
  const userRolesDetailed = (userRoles ?? []).map((r) => ({
    ...r,
    role_name: roleMap.get(r.role_id)?.name ?? null,
    is_system: roleMap.get(r.role_id)?.is_system ?? null,
  }));

  return NextResponse.json({
    centres: { count: centres.data?.length ?? 0, error: centres.error?.message, data: centres.data },
    staff: { count: staff.data?.length ?? 0, error: staff.error?.message, data: staff.data },
    children: { count: children.data?.length ?? 0, error: children.error?.message, data: children.data },
    subscriptions: { count: subs.data?.length ?? 0, error: subs.error?.message, data: subs.data },
    payments: { count: payments.data?.length ?? 0, error: payments.error?.message, data: payments.data },
    plans: { count: plans.data?.length ?? 0, error: plans.error?.message, data: plans.data },
    user_roles: { count: userRolesDetailed.length, data: userRolesDetailed },
  });
}
