import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditCreate } from "@/lib/audit/audit.service";
import { listAssessments, createAssessment, getCaseById } from "@/lib/cases/case.service";
import { createAssessmentSchema, cleanCaseInput } from "@/lib/cases/case.validation";
import type { CreateAssessmentInput } from "@/types/case";

// ─── GET /api/cases/[id]/assessments ─────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "cases.assessments.view");

    const adminSupabase = createAdminClient();
    const { data, count } = await listAssessments(adminSupabase, {
      centre_id: ctx.centre.id,
      case_id: id,
    });

    return NextResponse.json({ data, count });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("NOT_AUTHENTICATED")
      ? 401
      : message.includes("PERMISSION_DENIED")
        ? 403
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// ─── POST /api/cases/[id]/assessments ────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "cases.assessments.create");

    const adminSupabase = createAdminClient();

    const caseRecord = await getCaseById(adminSupabase, id);
    if (!caseRecord) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }
    if (caseRecord.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const body = await request.json();
    const cleaned = cleanCaseInput(body);
    const parsed = createAssessmentSchema.safeParse({
      ...cleaned,
      case_id: id,
      centre_id: ctx.centre.id,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const assessment = await createAssessment(adminSupabase, parsed.data as CreateAssessmentInput, ctx.authUserId);

    await auditCreate(adminSupabase, ctx, "case_assessment", assessment.id, {
      case_id: id,
      assessment_type: assessment.assessment_type,
      title: assessment.title,
    });

    return NextResponse.json({ data: assessment }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("NOT_AUTHENTICATED")
      ? 401
      : message.includes("PERMISSION_DENIED")
        ? 403
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
