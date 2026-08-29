import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditUpdate } from "@/lib/audit/audit.service";
import {
  getStaffById,
  listStaffTraining,
  updateStaffTraining,
} from "@/lib/staff/staff.service";
import {
  updateStaffTrainingSchema,
  cleanStaffInput,
} from "@/lib/staff/staff.validation";

function statusFromError(message: string): number {
  if (message.includes("NOT_AUTHENTICATED")) return 401;
  if (message.includes("PERMISSION_DENIED")) return 403;
  if (message.includes("USER_DEACTIVATED") || message.includes("CENTRE_NOT_ACTIVE")) return 403;
  return 500;
}

// ─── PATCH /api/staff/[id]/training/[trainingId] ─────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; trainingId: string }> },
) {
  try {
    const { id, trainingId } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "staff.training.manage");

    const adminSupabase = createAdminClient();
    const staff = await getStaffById(adminSupabase, id);
    if (!staff || staff.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Staff profile not found" }, { status: 404 });
    }

    const training = await listStaffTraining(adminSupabase, id);
    const record = training.find((t) => t.id === trainingId);
    if (!record) {
      return NextResponse.json({ error: "Training record not found" }, { status: 404 });
    }

    const body = await request.json();
    const cleaned = cleanStaffInput(body);
    const parsed = updateStaffTrainingSchema.safeParse(cleaned);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const updated = await updateStaffTraining(adminSupabase, trainingId, parsed.data);

    await auditUpdate(adminSupabase, ctx, "staff_training", trainingId,
      { completion_status: record.completion_status },
      { completion_status: updated?.completion_status },
    );

    return NextResponse.json({ data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}