import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditCreate } from "@/lib/audit/audit.service";
import {
  listEscalations,
  createEscalation,
  getSafeguardingConcernById,
} from "@/lib/safeguarding/safeguarding.service";
import {
  createEscalationSchema,
  cleanSafeguardingInput,
} from "@/lib/safeguarding/safeguarding.validation";
import type { CreateEscalationInput } from "@/types/safeguarding";

// ─── GET /api/safeguarding/[id]/escalations ──────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "safeguarding.escalations.view");

    const adminSupabase = createAdminClient();
    const { data, count } = await listEscalations(adminSupabase, {
      centre_id: ctx.centre.id,
      concern_id: id,
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

// ─── POST /api/safeguarding/[id]/escalations ─────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "safeguarding.escalate");

    const adminSupabase = createAdminClient();

    const concern = await getSafeguardingConcernById(adminSupabase, id);
    if (!concern) {
      return NextResponse.json({ error: "Safeguarding concern not found" }, { status: 404 });
    }
    if (concern.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Safeguarding concern not found" }, { status: 404 });
    }

    const body = await request.json();
    const cleaned = cleanSafeguardingInput(body);
    const parsed = createEscalationSchema.safeParse({
      ...cleaned,
      concern_id: id,
      centre_id: ctx.centre.id,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const escalation = await createEscalation(
      adminSupabase,
      parsed.data as CreateEscalationInput,
      ctx.authUserId,
    );

    await auditCreate(adminSupabase, ctx, "safeguarding_escalation", escalation.id, {
      concern_id: id,
      title: escalation.title,
      escalated_to: escalation.escalated_to,
    });

    return NextResponse.json({ data: escalation }, { status: 201 });
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
