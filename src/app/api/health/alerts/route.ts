import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditCreate } from "@/lib/audit/audit.service";
import { listHealthAlerts, createHealthAlert } from "@/lib/health/health.service";
import { createHealthAlertSchema, alertSearchSchema, cleanHealthInput } from "@/lib/health/health.validation";
import type { CreateHealthAlertInput } from "@/types/health";

function statusFromError(message: string): number {
  if (message.includes("NOT_AUTHENTICATED")) return 401;
  if (message.includes("PERMISSION_DENIED")) return 403;
  if (message.includes("USER_DEACTIVATED") || message.includes("CENTRE_NOT_ACTIVE")) return 403;
  if (message.includes("V_")) return 400;
  return 500;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "health.view");

    const { searchParams } = new URL(request.url);
    const parsed = alertSearchSchema.safeParse({
      child_id: searchParams.get("child_id") ?? undefined,
      is_active: searchParams.get("is_active") === null ? undefined : searchParams.get("is_active") === "true",
      visible_to_caregiver: searchParams.get("visible_to_caregiver") === null ? undefined : searchParams.get("visible_to_caregiver") === "true",
      limit: searchParams.get("limit") ?? undefined,
      offset: searchParams.get("offset") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
    }

    const adminSupabase = createAdminClient();
    const { data, count } = await listHealthAlerts(adminSupabase, {
      centre_id: ctx.centre.id,
      child_id: parsed.data.child_id || undefined,
      is_active: parsed.data.is_active,
      visible_to_caregiver: parsed.data.visible_to_caregiver,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    });

    return NextResponse.json({ data, count });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "health.update");

    const body = await request.json();
    const cleaned = cleanHealthInput(body);
    const parsed = createHealthAlertSchema.safeParse(cleaned);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    if (parsed.data.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Cannot create an alert for another centre" }, { status: 403 });
    }

    const adminSupabase = createAdminClient();
    const alert = await createHealthAlert(
      adminSupabase,
      parsed.data as CreateHealthAlertInput,
      ctx.authUserId,
    );

    await auditCreate(adminSupabase, ctx, "health_alert", alert.id, {
      child_id: alert.child_id,
      alert_type: alert.alert_type,
      severity: alert.severity,
      title: alert.title,
    });

    return NextResponse.json({ data: alert }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
