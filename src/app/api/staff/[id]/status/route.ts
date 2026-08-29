import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditUpdate } from "@/lib/audit/audit.service";
import { getStaffById, updateStaff, addStaffHistory } from "@/lib/staff/staff.service";
import { staffStatusSchema, cleanStaffInput } from "@/lib/staff/staff.validation";
import type { UpdateStaffInput } from "@/types/staff";

function statusFromError(message: string): number {
  if (message.includes("NOT_AUTHENTICATED")) return 401;
  if (message.includes("PERMISSION_DENIED")) return 403;
  if (message.includes("USER_DEACTIVATED") || message.includes("CENTRE_NOT_ACTIVE")) return 403;
  return 500;
}

// ─── POST /api/staff/[id]/status ─────────────────────────────
// Change staff employment status (separate from user account status).

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "staff.status.manage");

    const adminSupabase = createAdminClient();
    const existing = await getStaffById(adminSupabase, id);
    if (!existing || existing.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Staff profile not found" }, { status: 404 });
    }

    const body = await request.json();
    const cleaned = cleanStaffInput(body);
    const parsed = staffStatusSchema.safeParse(cleaned);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    if (parsed.data.status === existing.employment_status) {
      return NextResponse.json(
        { error: "Staff is already in this status" },
        { status: 400 },
      );
    }

    const updated = await updateStaff(adminSupabase, id, {
      employment_status: parsed.data.status,
      end_date: parsed.data.status === "ENDED" ? new Date().toISOString().slice(0, 10) : undefined,
    } as UpdateStaffInput);

    await addStaffHistory(
      adminSupabase,
      id,
      parsed.data.status === "ENDED" ? "ENDED" : "STATUS_CHANGED",
      `${existing.employment_status} -> ${parsed.data.status}`,
      ctx.profile.id,
    );

    await auditUpdate(adminSupabase, ctx, "staff_profile", id,
      { employment_status: existing.employment_status },
      { employment_status: updated.employment_status },
    );

    return NextResponse.json({ data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}