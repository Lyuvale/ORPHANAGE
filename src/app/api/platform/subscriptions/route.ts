import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import type { SupabaseClient } from "@supabase/supabase-js";

// ─── GET /api/platform/subscriptions ─────────────────────────

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "platform.view");

    const { searchParams } = new URL(request.url);
    const centreId = searchParams.get("centre_id") ?? undefined;
    const status = searchParams.get("status") ?? undefined;

    const admin = createAdminClient();

    let query = admin
      .from("subscriptions")
      .select(`
        id,
        centre_id,
        plan_id,
        status,
        start_date,
        end_date,
        trial_ends_at,
        payment_status,
        created_at,
        centres:centre_id (id, name, code),
        plans:plan_id (id, name, price, billing_period)
      `)
      .order("created_at", { ascending: false });

    if (centreId) {
      query = query.eq("centre_id", centreId);
    }
    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── POST /api/platform/subscriptions ────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "platform.view");

    const body = (await request.json()) as {
      centre_id?: string;
      plan_id?: string;
      status?: string;
      start_date?: string;
      end_date?: string;
    };

    if (!body.centre_id || !body.plan_id) {
      return NextResponse.json(
        { error: "centre_id and plan_id are required" },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    // Check for existing active subscription
    const { data: existing } = await admin
      .from("subscriptions")
      .select("id")
      .eq("centre_id", body.centre_id)
      .in("status", ["trial", "active"])
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: "Centre already has an active subscription. Cancel or expire it first." },
        { status: 409 },
      );
    }

    const { data, error } = await admin
      .from("subscriptions")
      .insert({
        centre_id: body.centre_id,
        plan_id: body.plan_id,
        status: body.status ?? "active",
        start_date: body.start_date ?? new Date().toISOString().split("T")[0],
        end_date: body.end_date ?? null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Record history
    await admin.from("subscription_history").insert({
      subscription_id: data.id,
      centre_id: body.centre_id,
      action: "CREATED",
      plan_id: body.plan_id,
      previous_status: null,
      new_status: body.status ?? "active",
      changed_by: ctx.authUserId,
      reason: "Subscription created by platform administrator",
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
