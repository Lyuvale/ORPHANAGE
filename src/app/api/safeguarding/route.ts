import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditCreate } from "@/lib/audit/audit.service";
import {
  listSafeguardingConcerns,
  createSafeguardingConcern,
} from "@/lib/safeguarding/safeguarding.service";
import {
  createSafeguardingConcernSchema,
  safeguardingSearchSchema,
  cleanSafeguardingInput,
} from "@/lib/safeguarding/safeguarding.validation";
import type { CreateSafeguardingConcernInput } from "@/types/safeguarding";

// ─── GET /api/safeguarding ───────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "safeguarding.view");

    const { searchParams } = new URL(request.url);
    const parsed = safeguardingSearchSchema.safeParse({
      child_id: searchParams.get("child_id") ?? undefined,
      case_id: searchParams.get("case_id") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      severity: searchParams.get("severity") ?? undefined,
      concern_type: searchParams.get("concern_type") ?? undefined,
      assigned_to: searchParams.get("assigned_to") ?? undefined,
      search: searchParams.get("search") ?? undefined,
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
    const { data, count } = await listSafeguardingConcerns(adminSupabase, {
      centre_id: ctx.centre.id,
      child_id: parsed.data.child_id || undefined,
      case_id: parsed.data.case_id || undefined,
      status: parsed.data.status,
      severity: parsed.data.severity,
      concern_type: parsed.data.concern_type,
      assigned_to: parsed.data.assigned_to || undefined,
      search: parsed.data.search,
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

// ─── POST /api/safeguarding ──────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "safeguarding.create");

    const body = await request.json();
    const cleaned = cleanSafeguardingInput(body);
    const parsed = createSafeguardingConcernSchema.safeParse(cleaned);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;

    if (data.centre_id !== ctx.centre.id) {
      return NextResponse.json(
        { error: "Cannot create safeguarding concern for another centre" },
        { status: 403 },
      );
    }

    const adminSupabase = createAdminClient();
    const concern = await createSafeguardingConcern(
      adminSupabase,
      data as CreateSafeguardingConcernInput,
      ctx.authUserId,
    );

    await auditCreate(adminSupabase, ctx, "safeguarding_concern", concern.id, {
      title: concern.title,
      concern_type: concern.concern_type,
      severity: concern.severity,
      child_id: concern.child_id,
    });

    return NextResponse.json({ data: concern }, { status: 201 });
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
