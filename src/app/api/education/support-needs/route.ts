import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditCreate } from "@/lib/audit/audit.service";
import {
  listEducationSupportNeeds,
  createEducationSupportNeed,
} from "@/lib/education/education.service";
import {
  createEducationSupportNeedSchema,
  supportNeedSearchSchema,
  cleanEducationInput,
} from "@/lib/education/education.validation";
import type { CreateEducationSupportNeedInput } from "@/types/education";

function statusFromError(message: string): number {
  if (message.includes("NOT_AUTHENTICATED")) return 401;
  if (message.includes("PERMISSION_DENIED")) return 403;
  if (message.includes("USER_DEACTIVATED") || message.includes("CENTRE_NOT_ACTIVE")) return 403;
  return 500;
}

// ─── GET /api/education/support-needs ────────────────────────

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "education_development.view");

    const parsed = supportNeedSearchSchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    );
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
    }

    const adminSupabase = createAdminClient();
    const result = await listEducationSupportNeeds(adminSupabase, {
      centre_id: ctx.centre.id,
      child_id: parsed.data.child_id || undefined,
      status: parsed.data.status,
      priority: parsed.data.priority,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    });

    return NextResponse.json({ data: result.data, count: result.count });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}

// ─── POST /api/education/support-needs ───────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "education_development.support_needs.manage");

    const body = await request.json();
    const cleaned = cleanEducationInput(body);
    const parsed = createEducationSupportNeedSchema.safeParse(cleaned);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    if (parsed.data.centre_id !== ctx.centre.id) {
      return NextResponse.json(
        { error: "Cannot create a support need for another centre" },
        { status: 403 },
      );
    }

    const adminSupabase = createAdminClient();
    const need = await createEducationSupportNeed(
      adminSupabase,
      parsed.data as CreateEducationSupportNeedInput,
      ctx.profile.id,
    );

    await auditCreate(adminSupabase, ctx, "education_support_need", need.id, {
      child_id: need.child_id,
      support_type: need.support_type,
      priority: need.priority,
      // Support needs record the NEED only — no financial transaction.
      financial_note: "No financial transaction is created by this module",
    });

    return NextResponse.json({ data: need }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
