import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditUpdate } from "@/lib/audit/audit.service";
import {
  updateSafeguardingStatus,
  getSafeguardingConcernById,
} from "@/lib/safeguarding/safeguarding.service";
import {
  updateSafeguardingStatusSchema,
  cleanSafeguardingInput,
} from "@/lib/safeguarding/safeguarding.validation";

// ─── PATCH /api/safeguarding/[id]/status ─────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "safeguarding.status.update");

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
    const parsed = updateSafeguardingStatusSchema.safeParse(cleaned);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const updated = await updateSafeguardingStatus(adminSupabase, id, ctx.centre.id, parsed.data);

    await auditUpdate(adminSupabase, ctx, "safeguarding_status", id, existing as unknown as Record<string, unknown>, {
      previous_status: existing.status,
      new_status: updated.status,
      reason: parsed.data.reason,
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
