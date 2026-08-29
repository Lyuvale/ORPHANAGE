import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditCreate } from "@/lib/audit/audit.service";
import { listStaff, createStaff } from "@/lib/staff/staff.service";
import {
  createStaffSchema,
  staffSearchSchema,
  cleanStaffInput,
} from "@/lib/staff/staff.validation";
import type { CreateStaffInput } from "@/types/staff";

function statusFromError(message: string): number {
  if (message.includes("NOT_AUTHENTICATED")) return 401;
  if (message.includes("PERMISSION_DENIED")) return 403;
  if (message.includes("USER_DEACTIVATED") || message.includes("CENTRE_NOT_ACTIVE")) return 403;
  return 500;
}

// ─── GET /api/staff ──────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "staff.view");

    const parsed = staffSearchSchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    );
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
    }

    const adminSupabase = createAdminClient();
    const result = await listStaff(adminSupabase, {
      centre_id: ctx.centre.id,
      search: parsed.data.search || undefined,
      employment_status: parsed.data.employment_status,
      operational_role: parsed.data.operational_role,
      department: parsed.data.department || undefined,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    });

    return NextResponse.json({ data: result.data, count: result.count });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}

// ─── POST /api/staff ─────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "staff.create");

    const body = await request.json();
    const cleaned = cleanStaffInput(body);
    const parsed = createStaffSchema.safeParse(cleaned);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    if (parsed.data.centre_id !== ctx.centre.id) {
      return NextResponse.json(
        { error: "Cannot create staff for another centre" },
        { status: 403 },
      );
    }

    const adminSupabase = createAdminClient();
    const staff = await createStaff(
      adminSupabase,
      parsed.data as CreateStaffInput,
      ctx.profile.id,
    );

    await auditCreate(adminSupabase, ctx, "staff_profile", staff.id, {
      job_title: staff.job_title,
      employment_status: staff.employment_status,
      has_linked_user: staff.user_profile_id !== null,
    });

    return NextResponse.json({ data: staff }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}