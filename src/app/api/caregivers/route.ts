import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { caregiverAssignmentScope } from "@/lib/caregivers/caregiver.service";
import { auditCreate } from "@/lib/audit/audit.service";
import {
  listChildCaregivers,
  createCaregiverAssignment,
} from "@/lib/caregivers/caregiver.service";

function statusFromError(message: string): number {
  if (message.includes("NOT_AUTHENTICATED")) return 401;
  if (message.includes("PERMISSION_DENIED")) return 403;
  return 500;
}

// ─── GET /api/caregivers?child_id=xxx ──────────────────────
// List caregiver assignments for a child.

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "children.view");

    const { searchParams } = new URL(request.url);
    const childId = searchParams.get("child_id");
    if (!childId) {
      return NextResponse.json({ error: "child_id is required" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Spec: a caregiver sees assignments of ASSIGNED CHILDREN ONLY.
    const { assignedIds } = await caregiverAssignmentScope(
      admin,
      supabase as unknown as SupabaseClient,
      ctx,
    );
    if (assignedIds && !assignedIds.includes(childId)) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 });
    }

    const assignments = await listChildCaregivers(admin, childId);
    return NextResponse.json({ data: assignments });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}

// ─── POST /api/caregivers ──────────────────────────────────
// Assign a child to a caregiver (Centre Manager + Social Worker).
// User-role assignment stays manager-only; this is care assignment.

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "staff.assignments.manage");

    const body = (await request.json()) as {
      child_id?: string;
      caregiver_id?: string;
      start_date?: string;
      end_date?: string | null;
      notes?: string | null;
    };

    if (!body.child_id || !body.caregiver_id) {
      return NextResponse.json(
        { error: "child_id and caregiver_id are required" },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    const assignment = await createCaregiverAssignment(
      admin,
      {
        child_id: body.child_id,
        caregiver_id: body.caregiver_id,
        start_date: body.start_date,
        end_date: body.end_date,
        notes: body.notes,
      },
      ctx.centre.id,
      ctx.authUserId,
    );

    await auditCreate(admin, ctx, "caregiver_assignment", assignment.id, {
      child_id: body.child_id,
      caregiver_id: body.caregiver_id,
    });

    return NextResponse.json({ data: assignment }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
