import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditCreate } from "@/lib/audit/audit.service";
import {
  listEducationAttendance,
  createEducationAttendance,
} from "@/lib/education/education-attendance.service";

function statusFromError(message: string): number {
  if (message.includes("NOT_AUTHENTICATED")) return 401;
  if (message.includes("PERMISSION_DENIED")) return 403;
  return 500;
}

// ─── GET /api/education/attendance ─────────────────────────

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "education_development.view");

    const { searchParams } = new URL(request.url);
    const childId = searchParams.get("child_id") ?? undefined;
    const dateFrom = searchParams.get("date_from") ?? undefined;
    const dateTo = searchParams.get("date_to") ?? undefined;

    const admin = createAdminClient();
    const records = await listEducationAttendance(admin, {
      child_id: childId,
      date_from: dateFrom,
      date_to: dateTo,
    });

    return NextResponse.json({ data: records });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}

// ─── POST /api/education/attendance ────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "education_development.progress.manage");

    const body = (await request.json()) as {
      child_id?: string;
      attendance_date?: string;
      status?: string;
      arrival_time?: string | null;
      departure_time?: string | null;
      notes?: string | null;
    };

    if (!body.child_id || !body.attendance_date || !body.status) {
      return NextResponse.json(
        { error: "child_id, attendance_date, and status are required" },
        { status: 400 },
      );
    }

    const validStatuses = ["present", "absent", "late", "excused", "holiday"];
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const record = await createEducationAttendance(
      admin,
      {
        child_id: body.child_id,
        attendance_date: body.attendance_date,
        status: body.status,
        arrival_time: body.arrival_time,
        departure_time: body.departure_time,
        notes: body.notes,
      },
      ctx.centre.id,
      ctx.authUserId,
    );

    await auditCreate(admin, ctx, "education_attendance", record.id, {
      child_id: body.child_id,
      attendance_date: body.attendance_date,
      status: body.status,
    });

    return NextResponse.json({ data: record }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
