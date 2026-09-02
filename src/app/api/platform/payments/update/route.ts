import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";

/**
 * PATCH /api/platform/payments/update
 * PLATFORM ADMIN: update payment status (approve/reject pending payments).
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient, {
      allowInactiveSubscription: true,
    });
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "platform.payments");

    const body = (await request.json()) as {
      payment_id?: string;
      status?: string;
    };

    if (!body.payment_id || !body.status) {
      return NextResponse.json({ error: "payment_id and status are required." }, { status: 400 });
    }

    const validStatuses = ["PENDING", "SUCCESSFUL", "FAILED", "CANCELLED", "REFUNDED"];
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` }, { status: 400 });
    }

    const admin = createAdminClient();

    // Get current payment
    const { data: current } = await admin
      .from("payment_transactions")
      .select("id, status, amount, centre_id")
      .eq("id", body.payment_id)
      .maybeSingle();

    if (!current) {
      return NextResponse.json({ error: "Payment not found." }, { status: 404 });
    }

    // Update payment status
    const { data, error } = await admin
      .from("payment_transactions")
      .update({ status: body.status })
      .eq("id", body.payment_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to update payment." }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
