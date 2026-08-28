import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditUpdate } from "@/lib/audit/audit.service";
import { updateVisitStatus, getVisitById } from "@/lib/visits/visit.service";
import { updateVisitStatusSchema, cleanVisitInput } from "@/lib/visits/visit.validation";

// ─── PATCH /api/visits/[id]/status ──────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);

    const adminSupabase = createAdminClient();
    const existing = await getVisitById(adminSupabase, id);

    if (!existing) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }

    if (existing.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }

    const body = await request.json();
    const cleaned = cleanVisitInput(body);
    const parsed = updateVisitStatusSchema.safeParse(cleaned);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    // Check permission based on target status
    const targetStatus = parsed.data.new_status;
    let requiredPermission: "visits.update" | "visits.approve" | "visits.reject" | "visits.cancel" = "visits.update";
    if (targetStatus === "approved" || targetStatus === "rejected") {
      requiredPermission = targetStatus === "approved" ? "visits.approve" : "visits.reject";
    } else if (targetStatus === "cancelled") {
      requiredPermission = "visits.cancel";
    }

    await requirePermission(supabase as unknown as SupabaseClient, ctx, requiredPermission);

    const updated = await updateVisitStatus(
      adminSupabase,
      id,
      ctx.centre.id,
      parsed.data,
      ctx.authUserId,
    );

    await auditUpdate(adminSupabase, ctx, "visit_status", id, existing as unknown as Record<string, unknown>, {
      previous_status: existing.status,
      new_status: updated.status,
      reason: parsed.data.reason,
    });

    return NextResponse.json({ data: updated });
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
