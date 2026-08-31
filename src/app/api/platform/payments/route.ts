import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { statusFromError } from "@/lib/resources/route-helpers";

/**
 * GET /api/platform/payments
 *
 * PLATFORM ADMIN: cross-centre payment/contribution overview. Gated by
 * requireAppAccess(+ allowInactiveSubscription) and platform.payments.
 * Returns both contribution and subscription payments with centre context.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient, {
      allowInactiveSubscription: true,
    });
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "platform.payments");

    const admin = createAdminClient();

    const { data, error } = await admin
      .from("payment_transactions")
      .select(
        "id, centre_id, flow_type, purpose, amount, currency, status, provider_reference, contributor_name, contributor_email, subscription_id, source_id, fund_id, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      return NextResponse.json({ error: "Failed to load payments" }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
