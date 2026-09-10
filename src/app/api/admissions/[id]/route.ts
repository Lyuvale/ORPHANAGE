import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditUpdate } from "@/lib/audit/audit.service";
import { notifyRole } from "@/lib/notifications/notifications.service";
import {
  getAdmissionById,
  updateAdmission,
  updateAdmissionStatus,
  getAdmissionHistory,
} from "@/lib/admissions/admission.service";
import {
  updateAdmissionSchema,
  updateAdmissionStatusSchema,
  cleanAdmissionInput,
} from "@/lib/admissions/admission.validation";
import type { UpdateAdmissionInput } from "@/types/admission";

// ─── GET /api/admissions/[id] ────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "admissions.view");

    const adminSupabase = createAdminClient();
    const admission = await getAdmissionById(adminSupabase, id);

    if (!admission) {
      return NextResponse.json({ error: "Admission not found" }, { status: 404 });
    }

    if (admission.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Admission not found" }, { status: 404 });
    }

    const history = await getAdmissionHistory(adminSupabase, id);

    return NextResponse.json({ data: { ...admission, status_history: history } });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("NOT_AUTHENTICATED")
      ? 401
      : message.includes("PERMISSION_DENIED")
        ? 403
        : message.includes("USER_DEACTIVATED") ||
            message.includes("CENTRE_NOT_ACTIVE")
          ? 403
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// ─── PATCH /api/admissions/[id] ──────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "admissions.review");

    const body = await request.json();

    if ("new_status" in body) {
      const parsed = updateAdmissionStatusSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.flatten() },
          { status: 400 },
        );
      }

      const adminSupabase = createAdminClient();
      const existing = await getAdmissionById(adminSupabase, id);

      if (!existing) {
        return NextResponse.json({ error: "Admission not found" }, { status: 404 });
      }

      if (existing.centre_id !== ctx.centre.id) {
        return NextResponse.json({ error: "Admission not found" }, { status: 404 });
      }

      const previousStatus = existing.status;
      const updated = await updateAdmissionStatus(
        adminSupabase,
        id,
        ctx.centre.id,
        parsed.data,
        ctx.authUserId,
      );

      await auditUpdate(adminSupabase, ctx, "admission", existing.id, {
        status: previousStatus,
      }, {
        status: updated.status,
        reason: parsed.data.reason ?? null,
      });

      // Handoff: an approved admission goes to the Records Officer for
      // official registration + placement (never back to the submitter).
      if (updated.status === "approved") {
        try {
          await notifyRole(
            adminSupabase,
            ctx.centre.id,
            ["RECORDS_OFFICER"],
            {
              title: "Admission approved — ready to register",
              message: `Admission ${existing.reference_number} was approved. Please register the child and arrange placement.`,
              type: "ACTION_REQUIRED",
              event_type: "ADMISSION_APPROVED",
              entity_type: "ADMISSION",
              entity_id: existing.id,
              route: "/register",
            },
            ctx.authUserId,
          );
        } catch {
          // Notification failure must not break the approval.
        }
      }

      // A denied recommendation returns to social workers with the reason.
      if (updated.status === "denied") {
        const reasonText = (parsed.data.reason ?? "").trim();
        try {
          await notifyRole(
            adminSupabase,
            ctx.centre.id,
            ["SOCIAL_WORKER"],
            {
              title: "Admission recommendation denied",
              message: `Admission ${existing.reference_number} was denied.${reasonText ? ` Reason: ${reasonText}` : ""}`,
              type: "WARNING",
              event_type: "ADMISSION_DECIDED",
              entity_type: "ADMISSION",
              entity_id: existing.id,
              route: "/dashboard",
            },
            ctx.authUserId,
          );
        } catch {
          // Notification failure must not break the review.
        }
      }

      return NextResponse.json({ data: updated });
    }

    const cleaned = cleanAdmissionInput(body);
    const parsed = updateAdmissionSchema.safeParse(cleaned);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const adminSupabase = createAdminClient();
    const existing = await getAdmissionById(adminSupabase, id);

    if (!existing) {
      return NextResponse.json({ error: "Admission not found" }, { status: 404 });
    }

    if (existing.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Admission not found" }, { status: 404 });
    }

    const updated = await updateAdmission(adminSupabase, id, parsed.data as UpdateAdmissionInput);

    await auditUpdate(adminSupabase, ctx, "admission", existing.id,
      { decision: existing.decision, conditions: existing.conditions },
      { decision: updated.decision, conditions: updated.conditions },
    );

    return NextResponse.json({ data: updated });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("NOT_AUTHENTICATED")
      ? 401
      : message.includes("PERMISSION_DENIED")
        ? 403
        : message.includes("USER_DEACTIVATED") ||
            message.includes("CENTRE_NOT_ACTIVE")
          ? 403
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
