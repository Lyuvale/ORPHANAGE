import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditUpdate } from "@/lib/audit/audit.service";
import {
  getMedicalRecordById,
  amendMedicalRecord,
} from "@/lib/health/health.service";
import {
  amendMedicalRecordSchema,
  cleanHealthInput,
} from "@/lib/health/health.validation";

function statusFromError(message: string): number {
  if (message.includes("NOT_AUTHENTICATED")) return 401;
  if (message.includes("PERMISSION_DENIED")) return 403;
  if (message.includes("USER_DEACTIVATED") || message.includes("CENTRE_NOT_ACTIVE")) return 403;
  return 500;
}

// ─── GET /api/health/medical-records/[id] ───────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "health.medical_records.view");

    const adminSupabase = createAdminClient();
    const record = await getMedicalRecordById(adminSupabase, id);

    if (!record || record.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Medical record not found" }, { status: 404 });
    }

    return NextResponse.json({ data: record });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}

// ─── POST /api/health/medical-records/[id]/amend ────────────
// Preserves the original and creates a traceable amended version.

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "health.medical_records.update");

    const adminSupabase = createAdminClient();
    const existing = await getMedicalRecordById(adminSupabase, id);

    if (!existing || existing.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Medical record not found" }, { status: 404 });
    }

    const body = await request.json();
    const cleaned = cleanHealthInput(body);
    const parsed = amendMedicalRecordSchema.safeParse(cleaned);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const amended = await amendMedicalRecord(
      adminSupabase,
      id,
      parsed.data,
      ctx.authUserId,
    );

    await auditUpdate(adminSupabase, ctx, "health_medical_record", id, {
      child_id: existing.child_id,
      record_type: existing.record_type,
      version: existing.version,
    }, {
      version: amended.version,
      amendment_reason: parsed.data.amendment_reason,
    });

    return NextResponse.json({ data: amended }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
