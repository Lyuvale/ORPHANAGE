import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditUpdate } from "@/lib/audit/audit.service";
import {
  getSafeguardingConcernById,
  updateSafeguardingConcern,
} from "@/lib/safeguarding/safeguarding.service";
import {
  updateSafeguardingConcernSchema,
  cleanSafeguardingInput,
} from "@/lib/safeguarding/safeguarding.validation";

// ─── GET /api/safeguarding/[id] ──────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "safeguarding.view");

    const adminSupabase = createAdminClient();
    const concern = await getSafeguardingConcernById(adminSupabase, id);

    if (!concern) {
      return NextResponse.json({ error: "Safeguarding concern not found" }, { status: 404 });
    }

    if (concern.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Safeguarding concern not found" }, { status: 404 });
    }

    return NextResponse.json({ data: concern });
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

// ─── PATCH /api/safeguarding/[id] ────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "safeguarding.update");

    const adminSupabase = createAdminClient();
    const existing = await getSafeguardingConcernById(adminSupabase, id);

    if (!existing) {
      return NextResponse.json({ error: "Safeguarding concern not found" }, { status: 404 });
    }

    if (existing.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Safeguarding concern not found" }, { status: 404 });
    }

    const body = await request.json();
    const cleaned = cleanSafeguardingInput(body);
    const parsed = updateSafeguardingConcernSchema.safeParse(cleaned);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const updated = await updateSafeguardingConcern(adminSupabase, id, parsed.data);

    await auditUpdate(adminSupabase, ctx, "safeguarding_concern", id, existing as unknown as Record<string, unknown>, {
      title: updated.title,
      severity: updated.severity,
      assigned_to: updated.assigned_to,
    });

    return NextResponse.json({ data: updated });
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
