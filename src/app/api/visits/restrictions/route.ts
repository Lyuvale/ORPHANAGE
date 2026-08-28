import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditCreate } from "@/lib/audit/audit.service";
import {
  listVisitRestrictions,
  createVisitRestriction,
} from "@/lib/visits/visit.service";
import {
  createRestrictionSchema,
  restrictionSearchSchema,
  cleanVisitInput,
} from "@/lib/visits/visit.validation";
import type { CreateRestrictionInput } from "@/types/visit";

// ─── GET /api/visits/restrictions ───────────────────────────

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "visits.restrictions.view");

    const { searchParams } = new URL(request.url);
    const parsed = restrictionSearchSchema.safeParse({
      child_id: searchParams.get("child_id") ?? undefined,
      guardian_id: searchParams.get("guardian_id") ?? undefined,
      is_active: searchParams.get("is_active") ?? undefined,
      restriction_type: searchParams.get("restriction_type") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      offset: searchParams.get("offset") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const adminSupabase = createAdminClient();
    const { data, count } = await listVisitRestrictions(adminSupabase, {
      centre_id: ctx.centre.id,
      child_id: parsed.data.child_id || undefined,
      guardian_id: parsed.data.guardian_id || undefined,
      is_active: parsed.data.is_active,
      restriction_type: parsed.data.restriction_type,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    });

    return NextResponse.json({ data, count });
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

// ─── POST /api/visits/restrictions ──────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "visits.restrictions.manage");

    const body = await request.json();
    const cleaned = cleanVisitInput(body);
    const parsed = createRestrictionSchema.safeParse(cleaned);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;

    if (data.centre_id !== ctx.centre.id) {
      return NextResponse.json(
        { error: "Cannot create restriction for another centre" },
        { status: 403 },
      );
    }

    const adminSupabase = createAdminClient();
    const restriction = await createVisitRestriction(
      adminSupabase,
      data as CreateRestrictionInput,
      ctx.authUserId,
    );

    await auditCreate(adminSupabase, ctx, "visit_restriction", restriction.id, {
      child_id: restriction.child_id,
      guardian_id: restriction.guardian_id,
      restriction_type: restriction.restriction_type,
      reason: restriction.reason,
    });

    return NextResponse.json({ data: restriction }, { status: 201 });
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
