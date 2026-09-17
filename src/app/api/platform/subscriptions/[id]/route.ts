import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditSecurityEvent } from "@/lib/audit/audit.service";
import type { SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = SupabaseClient<any, "public", any>;

/**
 * If a centre no longer has ANY valid subscription (trial/active), it stops
 * being operationally active. Removing/cancelling the last subscription is a
 * deliberate platform decision, so the centre transitions to `pending` — it is
 * no longer listed/active until a new subscription is provisioned and the
 * centre is activated again (activation requires a valid subscription).
 *
 * A centre whose subscription merely EXPIRES is NOT converted here: donations
 * serve the centre's needs, not the SaaS subscription, so an active centre
 * with a lapsed subscription keeps receiving online donations while platform
 * access is blocked by the subscription gate.
 */
async function deactivateCentreIfUnsubscribed(
  admin: AdminClient,
  ctx: Awaited<ReturnType<typeof requireAppAccess>>,
  centreId: string,
): Promise<void> {
  const { data: centre } = await admin
    .from("centres")
    .select("id, name, status")
    .eq("id", centreId)
    .maybeSingle();
  if (!centre || centre.status !== "active") return;

  const { count } = await admin
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("centre_id", centreId)
    .in("status", ["trial", "active"]);

  if ((count ?? 0) > 0) return;

  await admin.from("centres").update({ status: "pending" }).eq("id", centreId);
  try {
    await auditSecurityEvent(admin, {
      action: "CENTRE_STATUS_CHANGED",
      entity_type: "centre",
      entity_id: centreId,
      centre_id: centreId,
      actor_user_id: ctx.authUserId,
      actor_email: ctx.profile.email ?? undefined,
      previous_values: { status: "active" },
      new_values: { status: "pending" },
    });
  } catch {
    // Audit failure must not break the subscription operation.
  }
}

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
    if (body.end_date !== undefined) updates.end_date = body.end_date || null;

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

    // If the update moved the subscription to a terminal state (or left the
    // centre with no valid subscription at all), the centre stops being active.
    await deactivateCentreIfUnsubscribed(admin, ctx, current.centre_id);

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── DELETE /api/platform/subscriptions/[id] ─────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "platform.view");

    const { id } = await params;
    const admin = createAdminClient();

    // Get current subscription
    const { data: current, error: fetchError } = await admin
      .from("subscriptions")
      .select("id, centre_id, status")
      .eq("id", id)
      .single();

    if (fetchError || !current) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    // Record history before deleting
    await admin.from("subscription_history").insert({
      subscription_id: id,
      centre_id: current.centre_id,
      action: "DELETED",
      previous_status: current.status,
      new_status: null,
      changed_by: ctx.authUserId,
      reason: "Subscription deleted by platform administrator",
    });

    // Delete subscription
    const { error } = await admin
      .from("subscriptions")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Removal of the last valid subscription stops the centre from being active.
    await deactivateCentreIfUnsubscribed(admin, ctx, current.centre_id);

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
