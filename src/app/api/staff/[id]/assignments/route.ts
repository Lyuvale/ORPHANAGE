import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditCreate } from "@/lib/audit/audit.service";
import {
  getStaffById,
  listStaffAssignments,
  createStaffAssignment,
} from "@/lib/staff/staff.service";
import { addStaffHistory } from "@/lib/staff/staff.service";
import {
  createStaffAssignmentSchema,
  cleanStaffInput,
} from "@/lib/staff/staff.validation";
import type { CreateStaffAssignmentInput } from "@/types/staff";

function statusFromError(message: string): number {
  if (message.includes("NOT_AUTHENTICATED")) return 401;
  if (message.includes("PERMISSION_DENIED")) return 403;
  if (message.includes("USER_DEACTIVATED") || message.includes("CENTRE_NOT_ACTIVE")) return 403;
  return 500;
}

// ─── GET /api/staff/[id]/assignments ─────────────────────────

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

    const assignments = await listStaffAssignments(adminSupabase, id);
    return NextResponse.json({ data: assignments });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}

// ─── POST /api/staff/[id]/assignments ────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "staff.assignments.manage");

    const adminSupabase = createAdminClient();
    const staff = await getStaffById(adminSupabase, id);
    if (!staff || staff.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Staff profile not found" }, { status: 404 });
    }

    const body = await request.json();
    const cleaned = cleanStaffInput(body);
    const parsed = createStaffAssignmentSchema.safeParse(cleaned);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    if (parsed.data.centre_id !== ctx.centre.id) {
      return NextResponse.json(
        { error: "Cannot create an assignment for another centre" },
        { status: 403 },
      );
    }

    const assignment = await createStaffAssignment(
      adminSupabase,
      parsed.data as CreateStaffAssignmentInput,
      ctx.profile.id,
    );

    await addStaffHistory(
      adminSupabase,
      id,
      "ASSIGNMENT_CHANGED",
      `Assigned: ${parsed.data.responsibility_type}`,
      ctx.profile.id,
    );

    await auditCreate(adminSupabase, ctx, "staff_assignment", assignment.id, {
      staff_id: id,
      responsibility_type: assignment.responsibility_type,
    });

    return NextResponse.json({ data: assignment }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}