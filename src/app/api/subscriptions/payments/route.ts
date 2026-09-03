import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";

/**
 * GET /api/subscriptions/payments
 *
 * AUTHENTICATED CENTRE: list this centre's OWN submitted payment requests and
 * their review status (PENDING / SUCCESSFUL / FAILED / CANCELLED / REFUNDED)
 * plus any review feedback. Tenant-scoped to ctx.centre.id.
 *
 * SECURITY: gated by requireAppAccess + permissions ({subscriptions.manage}).
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "subscriptions.manage");

    const admin = createAdminClient();

    const { data, error } = await admin
      .from("payment_transactions")
      .select(
        "id, plan_id, amount, currency, status, provider_reference, review_feedback, purpose, created_at, reviewed_at",
      )
      .eq("centre_id", ctx.centre.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Failed to load payments." }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
