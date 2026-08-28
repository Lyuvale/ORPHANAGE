import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditUpdate } from "@/lib/audit/audit.service";
import { resolveHealthAlert } from "@/lib/health/health.service";
import { getHealthAlertById } from "@/lib/health/health.service";

function statusFromError(message: string): number {
  if (message.includes("NOT_AUTHENTICATED")) return 401;
  if (message.includes("PERMISSION_DENIED")) return 403;
  if (message.includes("USER_DEACTIVATED") || message.includes("CENTRE_NOT_ACTIVE")) return 403;
  return 500;
}

// ─── PATCH /api/health/alerts/[id]/resolve ──────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "health.update");

    const adminSupabase = createAdminClient();
    const existing = await getHealthAlertById(adminSupabase, id);

    if (!existing || existing.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Health alert not found" }, { status: 404 });
    }

    const updated = await resolveHealthAlert(adminSupabase, id);

    await auditUpdate(adminSupabase, ctx, "health_alert", id, {
      is_active: existing.is_active,
    }, {
      is_active: updated.is_active,
      resolved_at: updated.resolved_at,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
