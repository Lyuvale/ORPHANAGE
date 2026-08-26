import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditCreate } from "@/lib/audit/audit.service";
import {
  listSafeguardingActions,
  createSafeguardingAction,
  getSafeguardingConcernById,
} from "@/lib/safeguarding/safeguarding.service";
import {
  createSafeguardingActionSchema,
  cleanSafeguardingInput,
} from "@/lib/safeguarding/safeguarding.validation";
import type { CreateSafeguardingActionInput } from "@/types/safeguarding";

// ─── GET /api/safeguarding/[id]/actions ──────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "safeguarding.actions.view");

    const adminSupabase = createAdminClient();
    const { data, count } = await listSafeguardingActions(adminSupabase, {
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

// ─── POST /api/safeguarding/[id]/actions ─────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "safeguarding.actions.create");

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
    const parsed = createSafeguardingActionSchema.safeParse({
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

    const action = await createSafeguardingAction(
      adminSupabase,
      parsed.data as CreateSafeguardingActionInput,
      ctx.authUserId,
    );

    await auditCreate(adminSupabase, ctx, "safeguarding_action", action.id, {
      concern_id: id,
      action_type: action.action_type,
      description: action.description,
    });

    return NextResponse.json({ data: action }, { status: 201 });
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
