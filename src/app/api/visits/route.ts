import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditCreate } from "@/lib/audit/audit.service";
import { listVisits, createVisit } from "@/lib/visits/visit.service";
import { createVisitSchema, visitSearchSchema, cleanVisitInput } from "@/lib/visits/visit.validation";
import type { CreateVisitInput } from "@/types/visit";

// ─── GET /api/visits ────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "visits.view");

    const { searchParams } = new URL(request.url);
    const parsed = visitSearchSchema.safeParse({
      status: searchParams.get("status") ?? undefined,
      visit_type: searchParams.get("visit_type") ?? undefined,
      child_id: searchParams.get("child_id") ?? undefined,
      guardian_id: searchParams.get("guardian_id") ?? undefined,
      date_from: searchParams.get("date_from") ?? undefined,
      date_to: searchParams.get("date_to") ?? undefined,
      upcoming: searchParams.get("upcoming") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      offset: searchParams.get("offset") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const adminSupabase = createAdminClient();
    const { data, count } = await listVisits(adminSupabase, {
      centre_id: ctx.centre.id,
      status: parsed.data.status,
      visit_type: parsed.data.visit_type,
      child_id: parsed.data.child_id || undefined,
      guardian_id: parsed.data.guardian_id || undefined,
      date_from: parsed.data.date_from || undefined,
      date_to: parsed.data.date_to || undefined,
      upcoming: parsed.data.upcoming || undefined,
      search: parsed.data.search,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    });

    return NextResponse.json({ data, count });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("NOT_AUTHENTICATED")
      ? 401
      : message.includes("PERMISSION_DENIED")
        ? 403
        : message.includes("USER_DEACTIVATED") || message.includes("CENTRE_NOT_ACTIVE")
          ? 403
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// ─── POST /api/visits ───────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "visits.create");

    const body = await request.json();
    const cleaned = cleanVisitInput(body);
    const parsed = createVisitSchema.safeParse(cleaned);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;

    if (data.centre_id !== ctx.centre.id) {
      return NextResponse.json(
        { error: "Cannot create visit for another centre" },
        { status: 403 },
      );
    }

    const adminSupabase = createAdminClient();
    const visit = await createVisit(adminSupabase, data as CreateVisitInput, ctx.authUserId);

    await auditCreate(adminSupabase, ctx, "visit", visit.id, {
      reference_number: visit.reference_number,
      child_id: visit.child_id,
      guardian_id: visit.guardian_id,
      visit_type: visit.visit_type,
      scheduled_date: visit.scheduled_date,
      purpose: visit.purpose,
    });

    return NextResponse.json({ data: visit }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("NOT_AUTHENTICATED")
      ? 401
      : message.includes("PERMISSION_DENIED")
        ? 403
        : message.includes("USER_DEACTIVATED") || message.includes("CENTRE_NOT_ACTIVE")
          ? 403
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
