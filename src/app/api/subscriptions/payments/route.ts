import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { getUserRoleName } from "@/lib/auth/authorization.service";

/**
 * GET /api/subscriptions/payments
 *
 * AUTHENTICATED CENTRE MANAGER: list this centre's OWN submitted payment requests
 * and their review status (PENDING / SUCCESSFUL / FAILED / CANCELLED / REFUNDED)
 * plus any review feedback. Tenant-scoped to ctx.centre.id.
 *
 * SECURITY: gated by requireAppAccess + CENTRE_MANAGER role and scoped to the
 * caller's own centre.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    // A centre checks its payment requests precisely while its subscription is
    // inactive/pending — allow it so they can see review status + feedback.
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient, {
      allowInactiveSubscription: true,
    });

    const roleName = await getUserRoleName(supabase as unknown as SupabaseClient, ctx);
    if (roleName !== "CENTRE_MANAGER") {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

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
