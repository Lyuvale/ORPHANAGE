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

  return NextResponse.json({
    centres: { count: centres.data?.length ?? 0, error: centres.error?.message, data: centres.data },
    staff: { count: staff.data?.length ?? 0, error: staff.error?.message, data: staff.data },
    children: { count: children.data?.length ?? 0, error: children.error?.message, data: children.data },
    subscriptions: { count: subs.data?.length ?? 0, error: subs.error?.message, data: subs.data },
    payments: { count: payments.data?.length ?? 0, error: payments.error?.message, data: payments.data },
    plans: { count: plans.data?.length ?? 0, error: plans.error?.message, data: plans.data },
  });
}
