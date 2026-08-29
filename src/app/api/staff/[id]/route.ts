import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditUpdate } from "@/lib/audit/audit.service";
import { getStaffById, updateStaff } from "@/lib/staff/staff.service";
import { addStaffHistory } from "@/lib/staff/staff.service";
import { updateStaffSchema, cleanStaffInput } from "@/lib/staff/staff.validation";
import type { UpdateStaffInput } from "@/types/staff";

function statusFromError(message: string): number {
  if (message.includes("NOT_AUTHENTICATED")) return 401;
  if (message.includes("PERMISSION_DENIED")) return 403;
  if (message.includes("USER_DEACTIVATED") || message.includes("CENTRE_NOT_ACTIVE")) return 403;
  return 500;
}

// ─── GET /api/staff/[id] ─────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "staff.view");

    const adminSupabase = createAdminClient();
    const staff = await getStaffById(adminSupabase, id);

    if (!staff || staff.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Staff profile not found" }, { status: 404 });
    }

    return NextResponse.json({ data: staff });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}

// ─── PATCH /api/staff/[id] ───────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "staff.update");

    const adminSupabase = createAdminClient();
    const existing = await getStaffById(adminSupabase, id);
    if (!existing || existing.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Staff profile not found" }, { status: 404 });
    }

    const body = await request.json();
    const cleaned = cleanStaffInput(body);
    const parsed = updateStaffSchema.safeParse(cleaned);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const updated = await updateStaff(
      adminSupabase,
      id,
      parsed.data as UpdateStaffInput,
    );

    // Record history when job title or employment status changes.
    if (
      parsed.data.job_title !== undefined &&
      parsed.data.job_title !== existing.job_title
    ) {
      await addStaffHistory(
        adminSupabase,
        id,
        "JOB_TITLE_CHANGED",
        `${existing.job_title} -> ${parsed.data.job_title}`,
        ctx.profile.id,
      );
    }
    if (
      parsed.data.employment_status !== undefined &&
      parsed.data.employment_status !== existing.employment_status
    ) {
      await addStaffHistory(
        adminSupabase,
        id,
        parsed.data.employment_status === "ENDED" ? "ENDED" : "STATUS_CHANGED",
        `${existing.employment_status} -> ${parsed.data.employment_status}`,
        ctx.profile.id,
      );
    }

    await auditUpdate(adminSupabase, ctx, "staff_profile", id,
      { job_title: existing.job_title, employment_status: existing.employment_status },
      { job_title: updated.job_title, employment_status: updated.employment_status },
    );

    return NextResponse.json({ data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}