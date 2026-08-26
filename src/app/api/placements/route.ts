import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditCreate } from "@/lib/audit/audit.service";
import {
  listPlacements,
  createPlacement,
} from "@/lib/placements/placement.service";
import {
  createPlacementSchema,
  placementSearchSchema,
  cleanPlacementInput,
} from "@/lib/placements/placement.validation";
import type { CreatePlacementInput } from "@/types/placement";

// ─── GET /api/placements ─────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "placements.view");

    const { searchParams } = new URL(request.url);
    const parsed = placementSearchSchema.safeParse({
      status: searchParams.get("status") ?? undefined,
      child_id: searchParams.get("child_id") ?? undefined,
      placement_type: searchParams.get("placement_type") ?? undefined,
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
    const { data, count } = await listPlacements(adminSupabase, {
      centre_id: ctx.centre.id,
      status: parsed.data.status,
      child_id: parsed.data.child_id,
      placement_type: parsed.data.placement_type,
      search: parsed.data.search,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    });

    return NextResponse.json({ data, count });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("NOT_AUTHENTICATED")
      ? 401
      : message.includes("PERMISSION_DENIED")
        ? 403
        : message.includes("USER_DEACTIVATED") ||
            message.includes("CENTRE_NOT_ACTIVE")
          ? 403
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// ─── POST /api/placements ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "placements.create");

    const body = await request.json();
    const cleaned = cleanPlacementInput(body);
    const parsed = createPlacementSchema.safeParse(cleaned);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;

    if (data.centre_id !== ctx.centre.id) {
      return NextResponse.json(
        { error: "Cannot create placement for another centre" },
        { status: 403 },
      );
    }

    const adminSupabase = createAdminClient();
    const placement = await createPlacement(adminSupabase, data as CreatePlacementInput);

    await auditCreate(adminSupabase, ctx, "placement", placement.id, {
      reference_number: placement.reference_number,
      child_id: placement.child_id,
      status: placement.status,
      placement_type: placement.placement_type,
    });

    return NextResponse.json({ data: placement }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("NOT_AUTHENTICATED")
      ? 401
      : message.includes("PERMISSION_DENIED")
        ? 403
        : message.includes("USER_DEACTIVATED") ||
            message.includes("CENTRE_NOT_ACTIVE")
          ? 403
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
