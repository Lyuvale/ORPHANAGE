import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditCreate } from "@/lib/audit/audit.service";
import { listInterventions, createIntervention, getCaseById } from "@/lib/cases/case.service";
import { createInterventionSchema, cleanCaseInput } from "@/lib/cases/case.validation";
import type { CreateInterventionInput } from "@/types/case";

// ─── GET /api/cases/[id]/interventions ───────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "cases.interventions.view");

    const adminSupabase = createAdminClient();
    const interventions = await listInterventions(adminSupabase, id);

    return NextResponse.json({ data: interventions });
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

// ─── POST /api/cases/[id]/interventions ──────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "cases.interventions.create");

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
    const parsed = createInterventionSchema.safeParse({
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

    const intervention = await createIntervention(adminSupabase, parsed.data as CreateInterventionInput);

    await auditCreate(adminSupabase, ctx, "intervention", intervention.id, {
      case_id: id,
      title: intervention.title,
      intervention_type: intervention.intervention_type,
    });

    return NextResponse.json({ data: intervention }, { status: 201 });
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
