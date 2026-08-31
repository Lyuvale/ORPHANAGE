import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { recordAuditEvent } from "@/lib/audit/audit.service";
import { statusFromError } from "@/lib/resources/route-helpers";

/**
 * GET /api/platform/centres
 * PLATFORM ADMIN: list all centres across the platform (platform.centres).
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient, {
      allowInactiveSubscription: true,
    });
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "platform.centres");

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("centres")
      .select("id, name, code, is_active, created_at")
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: "Failed to load centres" }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}

/**
 * PATCH /api/platform/centres
 * PLATFORM ADMIN: update a centre (e.g. activate/deactivate) — platform.centres.
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient, {
      allowInactiveSubscription: true,
    });
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "platform.centres");

    const body = (await request.json()) as { centre_id?: string; is_active?: boolean };
    if (!body.centre_id || typeof body.is_active !== "boolean") {
      return NextResponse.json({ error: "V_INVALID: centre_id and is_active required" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: existing } = await admin
      .from("centres")
      .select("id, name, is_active")
      .eq("id", body.centre_id)
      .maybeSingle();
    if (!existing) {
      return NextResponse.json({ error: "Centre not found" }, { status: 404 });
    }

    const { data, error } = await admin
      .from("centres")
      .update({ is_active: body.is_active })
      .eq("id", body.centre_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to update centre" }, { status: 500 });
    }

    await recordAuditEvent(admin, ctx, {
      action: "CENTRE_STATUS_CHANGED",
      entity_type: "centre",
      entity_id: body.centre_id,
      previous_values: { is_active: existing.is_active },
      new_values: { is_active: body.is_active },
    });

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
