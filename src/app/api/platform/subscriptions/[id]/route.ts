import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import type { SupabaseClient } from "@supabase/supabase-js";

// ─── PATCH /api/platform/subscriptions/[id] ──────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "platform.view");

    const { id } = await params;
    const body = (await request.json()) as {
      status?: string;
      plan_id?: string;
      end_date?: string;
    };

    const admin = createAdminClient();

    // Get current subscription
    const { data: current, error: fetchError } = await admin
      .from("subscriptions")
      .select("id, centre_id, plan_id, status")
      .eq("id", id)
      .single();

    if (fetchError || !current) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    if (body.status) updates.status = body.status;
    if (body.plan_id) updates.plan_id = body.plan_id;
    if (body.end_date) updates.end_date = body.end_date;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    const { data, error } = await admin
      .from("subscriptions")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Record history
    const actions: string[] = [];
    if (body.status && body.status !== current.status) actions.push(`STATUS:${current.status}→${body.status}`);
    if (body.plan_id && body.plan_id !== current.plan_id) actions.push("PLAN_CHANGED");
    if (body.end_date) actions.push("EXTENDED");

    await admin.from("subscription_history").insert({
      subscription_id: id,
      centre_id: current.centre_id,
      action: actions.join(",") || "UPDATED",
      plan_id: body.plan_id ?? current.plan_id,
      previous_status: current.status,
      new_status: body.status ?? current.status,
      changed_by: ctx.authUserId,
      reason: `Subscription updated by platform administrator`,
    });

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
