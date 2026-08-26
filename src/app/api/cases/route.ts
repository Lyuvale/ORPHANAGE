import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditCreate } from "@/lib/audit/audit.service";
import { listCases, createCase } from "@/lib/cases/case.service";
import { createCaseSchema, caseSearchSchema, cleanCaseInput } from "@/lib/cases/case.validation";
import type { CreateCaseInput } from "@/types/case";

// ─── GET /api/cases ──────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "cases.view");

    const { searchParams } = new URL(request.url);
    const parsed = caseSearchSchema.safeParse({
      status: searchParams.get("status") ?? undefined,
      case_type: searchParams.get("case_type") ?? undefined,
      priority: searchParams.get("priority") ?? undefined,
      classification: searchParams.get("classification") ?? undefined,
      child_id: searchParams.get("child_id") ?? undefined,
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
    const { data, count } = await listCases(adminSupabase, {
      centre_id: ctx.centre.id,
      status: parsed.data.status,
      case_type: parsed.data.case_type,
      priority: parsed.data.priority,
      classification: parsed.data.classification,
      child_id: parsed.data.child_id || undefined,
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

// ─── POST /api/cases ─────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "cases.create");

    const body = await request.json();
    const cleaned = cleanCaseInput(body);
    const parsed = createCaseSchema.safeParse(cleaned);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;

    if (data.centre_id !== ctx.centre.id) {
      return NextResponse.json(
        { error: "Cannot create case for another centre" },
        { status: 403 },
      );
    }

    const adminSupabase = createAdminClient();
    const caseRecord = await createCase(adminSupabase, data as CreateCaseInput, ctx.authUserId);

    await auditCreate(adminSupabase, ctx, "case", caseRecord.id, {
      reference_number: caseRecord.reference_number,
      title: caseRecord.title,
      case_type: caseRecord.case_type,
      child_id: caseRecord.child_id,
      priority: caseRecord.priority,
      classification: caseRecord.classification,
    });

    return NextResponse.json({ data: caseRecord }, { status: 201 });
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
