import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditUpdate } from "@/lib/audit/audit.service";
import { getAppointmentById, updateAppointmentStatus } from "@/lib/health/health.service";
import { updateAppointmentStatusSchema, cleanHealthInput } from "@/lib/health/health.validation";

function statusFromError(message: string): number {
  if (message.includes("NOT_AUTHENTICATED")) return 401;
  if (message.includes("PERMISSION_DENIED")) return 403;
  if (message.includes("USER_DEACTIVATED") || message.includes("CENTRE_NOT_ACTIVE")) return 403;
  return 500;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "health.appointments.view");

    const adminSupabase = createAdminClient();
    const appointment = await getAppointmentById(adminSupabase, id);

    if (!appointment || appointment.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    return NextResponse.json({ data: appointment });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}

// ─── PATCH /api/health/appointments/[id]/status ─────────────
// Status changes are traceable via health_appointment_history.

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "health.appointments.manage");

    const adminSupabase = createAdminClient();
    const existing = await getAppointmentById(adminSupabase, id);

    if (!existing || existing.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const body = await request.json();
    const cleaned = cleanHealthInput(body);
    const parsed = updateAppointmentStatusSchema.safeParse(cleaned);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const updated = await updateAppointmentStatus(
      adminSupabase,
      id,
      parsed.data,
      ctx.authUserId,
    );

    await auditUpdate(adminSupabase, ctx, "health_appointment", id, {
      status: existing.status,
    }, {
      status: updated.status,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
