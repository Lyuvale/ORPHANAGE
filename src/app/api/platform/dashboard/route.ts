import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { statusFromError } from "@/lib/resources/route-helpers";

/**
 * GET /api/platform/dashboard
 *
 * PLATFORM ADMIN: summary statistics across all centres. Gated by
 * requireAppAccess (+ allowInactiveSubscription so platform management remains
 * possible regardless of the admin's home-centre subscription state) and
 * requirePermission("platform.view").
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient, {
      allowInactiveSubscription: true,
    });
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "platform.view");

    const admin = createAdminClient();

    const [centreRes, activeCentreRes, subRes, activeSubRes, payRes, contribRes] =
      await Promise.all([
        admin.from("centres").select("id", { count: "exact", head: true }),
        admin.from("centres").select("id", { count: "exact", head: true }).eq("is_active", true),
        admin
          .from("subscriptions")
          .select("id", { count: "exact", head: true }),
        admin
          .from("subscriptions")
          .select("id", { count: "exact", head: true })
          .eq("status", "active"),
        admin
          .from("payment_transactions")
          .select("id, amount", { count: "exact" }),
        admin
          .from("payment_transactions")
          .select("id, amount")
          .eq("flow_type", "CONTRIBUTION")
          .eq("status", "SUCCESSFUL"),
      ]);

    const totalContributions = (contribRes.data ?? []).reduce(
      (sum: number, r: { amount: number | string }) => sum + Number(r.amount),
      0,
    );

    const { data: alerts } = await admin
      .from("platform_alerts")
      .select("id, severity, title, message, created_at")
      .eq("is_resolved", false)
      .order("created_at", { ascending: false })
      .limit(10);

    return NextResponse.json({
      data: {
        centres: centreRes.count ?? 0,
        active_centres: activeCentreRes.count ?? 0,
        subscriptions: subRes.count ?? 0,
        active_subscriptions: activeSubRes.count ?? 0,
        payments: payRes.count ?? 0,
        total_contributions_amount: totalContributions,
        alerts: alerts ?? [],
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
