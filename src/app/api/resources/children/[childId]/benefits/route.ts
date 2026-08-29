import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { listChildBenefits } from "@/lib/resources/resources.service";
import { statusFromError } from "@/lib/resources/route-helpers";

// ─── GET /api/resources/children/[childId]/benefits ──────────
// Returns all Benefits received by an EXISTING child, each with its
// full chain: Benefit -> Expense -> Fund -> Source.
// Used inside the existing Child Profile to show where the child's
// support came from (Social Worker has view access to this resource).

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ childId: string }> },
) {
  try {
    const { childId } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "resources.view");

    const adminSupabase = createAdminClient();
    // Verify the child actually belongs to this centre (tenant isolation).
    const { data: child, error } = await adminSupabase
      .from("children")
      .select("id, centre_id")
      .eq("id", childId)
      .single();
    if (error || !child || child.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 });
    }

    const benefits = await listChildBenefits(adminSupabase, childId, ctx.centre.id);
    return NextResponse.json({ data: benefits });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
