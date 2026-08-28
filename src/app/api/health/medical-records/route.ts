import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditCreate } from "@/lib/audit/audit.service";
import {
  listMedicalRecords,
  createMedicalRecord,
} from "@/lib/health/health.service";
import {
  createMedicalRecordSchema,
  medicalRecordSearchSchema,
  cleanHealthInput,
} from "@/lib/health/health.validation";
import type { CreateMedicalRecordInput } from "@/types/health";

function statusFromError(message: string): number {
  if (message.includes("NOT_AUTHENTICATED")) return 401;
  if (message.includes("PERMISSION_DENIED")) return 403;
  if (message.includes("USER_DEACTIVATED") || message.includes("CENTRE_NOT_ACTIVE")) return 403;
  return 500;
}

// ─── GET /api/health/medical-records ────────────────────────

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "health.medical_records.view");

    const { searchParams } = new URL(request.url);
    const parsed = medicalRecordSearchSchema.safeParse({
      child_id: searchParams.get("child_id") ?? undefined,
      record_type: searchParams.get("record_type") ?? undefined,
      date_from: searchParams.get("date_from") ?? undefined,
      date_to: searchParams.get("date_to") ?? undefined,
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
    const { data, count } = await listMedicalRecords(adminSupabase, {
      centre_id: ctx.centre.id,
      child_id: parsed.data.child_id || undefined,
      record_type: parsed.data.record_type,
      date_from: parsed.data.date_from || undefined,
      date_to: parsed.data.date_to || undefined,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    });

    return NextResponse.json({ data, count });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}

// ─── POST /api/health/medical-records ───────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "health.medical_records.create");

    const body = await request.json();
    const cleaned = cleanHealthInput(body);
    const parsed = createMedicalRecordSchema.safeParse(cleaned);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    if (parsed.data.centre_id !== ctx.centre.id) {
      return NextResponse.json(
        { error: "Cannot create a medical record for another centre" },
        { status: 403 },
      );
    }

    const adminSupabase = createAdminClient();
    const record = await createMedicalRecord(
      adminSupabase,
      parsed.data as CreateMedicalRecordInput,
      ctx.authUserId,
    );

    await auditCreate(adminSupabase, ctx, "health_medical_record", record.id, {
      child_id: record.child_id,
      record_type: record.record_type,
      record_date: record.record_date,
      followup_required: record.followup_required,
    });

    return NextResponse.json({ data: record }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
