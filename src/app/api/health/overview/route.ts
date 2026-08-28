import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { getHealthOverview } from "@/lib/health/health.service";

function statusFromError(message: string): number {
  if (message.includes("NOT_AUTHENTICATED")) return 401;
  if (message.includes("PERMISSION_DENIED")) return 403;
  if (message.includes("USER_DEACTIVATED") || message.includes("CENTRE_NOT_ACTIVE")) return 403;
  return 500;
}

// ─── GET /api/health/overview ───────────────────────────────
// Aggregated health snapshot for the current centre.

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "health.view");

    const { searchParams } = new URL(request.url);
    const childId = searchParams.get("child_id");

    if (!childId) {
      return NextResponse.json({ error: "child_id query parameter is required" }, { status: 400 });
    }

    const adminSupabase = createAdminClient();
    const overview = await getHealthOverview(adminSupabase, ctx.centre.id, childId);

    return NextResponse.json({ data: overview });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
