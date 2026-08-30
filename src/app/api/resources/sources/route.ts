import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditCreate } from "@/lib/audit/audit.service";
import { notifyRole } from "@/lib/notifications/notifications.service";
import { listSources, createSource } from "@/lib/resources/resources.service";
import { createSourceSchema, coerceCreate } from "@/lib/resources/resources.validation";
import type { CreateSupportSourceInput } from "@/types/resources";
import { statusFromError } from "@/lib/resources/route-helpers";

// ─── GET /api/resources/sources ──────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "resources.view");

    const type = request.nextUrl.searchParams.get("type") || undefined;

    const adminSupabase = createAdminClient();
    const result = await listSources(adminSupabase, ctx.centre.id, type);
    return NextResponse.json({ data: result.data, count: result.count });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}

// ─── POST /api/resources/sources ─────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "resources.manage");

    const body = await request.json();
    const cleaned = coerceCreate(body);
    const parsed = createSourceSchema.safeParse(cleaned);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    if (parsed.data.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Cannot create a source for another centre" }, { status: 403 });
    }

    const adminSupabase = createAdminClient();
    const source = await createSource(
      adminSupabase,
      parsed.data as CreateSupportSourceInput,
      ctx.authUserId,
    );

    await auditCreate(adminSupabase, ctx, "support_source", source.id, {
      source_name: source.source_name,
      source_type: source.source_type,
      amount: source.amount,
    });

    await notifyRole(adminSupabase, ctx.centre.id, ["CENTRE_MANAGER", "ACCOUNTANT_BURSAR"], {
      title: "New funding source recorded",
      message: `${source.source_name} was recorded as a new funding source.`,
      type: "INFORMATION",
      event_type: "SOURCE_RECORDED",
      entity_type: "SOURCE",
      entity_id: source.id,
      route: "/resources/sources",
    }, ctx.authUserId);

    return NextResponse.json({ data: source }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
