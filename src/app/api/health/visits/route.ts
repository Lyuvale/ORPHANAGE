import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditCreate } from "@/lib/audit/audit.service";
import { listMedicalVisits, createMedicalVisit } from "@/lib/health/health.service";
import { createMedicalVisitSchema, healthSearchSchema, cleanHealthInput } from "@/lib/health/health.validation";
import type { CreateMedicalVisitInput } from "@/types/health";

function statusFromError(message: string): number {
  if (message.includes("NOT_AUTHENTICATED")) return 401;
  if (message.includes("PERMISSION_DENIED")) return 403;
  if (message.includes("USER_DEACTIVATED") || message.includes("CENTRE_NOT_ACTIVE")) return 403;
  return 500;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "health.medical_records.view");

    const { searchParams } = new URL(request.url);
    const parsed = healthSearchSchema.safeParse({
      child_id: searchParams.get("child_id") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      offset: searchParams.get("offset") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
    }

    const adminSupabase = createAdminClient();
    const { data, count } = await listMedicalVisits(adminSupabase, {
      centre_id: ctx.centre.id,
      child_id: parsed.data.child_id || undefined,
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
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "health.medical_records.create");

    const body = await request.json();
    const cleaned = cleanHealthInput(body);
    const parsed = createMedicalVisitSchema.safeParse(cleaned);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    if (parsed.data.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Cannot create a medical visit for another centre" }, { status: 403 });
    }

    const adminSupabase = createAdminClient();
    const visit = await createMedicalVisit(adminSupabase, parsed.data as CreateMedicalVisitInput, ctx.authUserId);

    await auditCreate(adminSupabase, ctx, "health_medical_visit", visit.id, {
      child_id: visit.child_id,
      visit_type: visit.visit_type,
      visit_date: visit.visit_date,
    });

    return NextResponse.json({ data: visit }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
