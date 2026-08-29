import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditUpdate } from "@/lib/audit/audit.service";
import {
  getStaffById,
  listStaffAssignments,
  endStaffAssignment,
} from "@/lib/staff/staff.service";
import { addStaffHistory } from "@/lib/staff/staff.service";

function statusFromError(message: string): number {
  if (message.includes("NOT_AUTHENTICATED")) return 401;
  if (message.includes("PERMISSION_DENIED")) return 403;
  if (message.includes("USER_DEACTIVATED") || message.includes("CENTRE_NOT_ACTIVE")) return 403;
  return 500;
}

// ─── POST /api/staff/[id]/assignments/[assignmentId]/end ─────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> },
) {
  try {
    const { id, assignmentId } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "staff.assignments.manage");

    const adminSupabase = createAdminClient();
    const staff = await getStaffById(adminSupabase, id);
    if (!staff || staff.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Staff profile not found" }, { status: 404 });
    }

    const assignments = await listStaffAssignments(adminSupabase, id);
    const assignment = assignments.find((a) => a.id === assignmentId);
    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    const ended = await endStaffAssignment(adminSupabase, assignmentId);
    if (!ended) {
      return NextResponse.json(
        { error: "Assignment is already ended or not found" },
        { status: 400 },
      );
    }

    await addStaffHistory(
      adminSupabase,
      id,
      "ASSIGNMENT_CHANGED",
      `Ended: ${assignment.responsibility_type}`,
      ctx.profile.id,
    );

    await auditUpdate(adminSupabase, ctx, "staff_assignment", assignmentId,
      { status: assignment.status },
      { status: ended.status },
    );

    return NextResponse.json({ data: ended });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}