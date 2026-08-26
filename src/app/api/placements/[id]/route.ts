import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditUpdate } from "@/lib/audit/audit.service";
import {
  getPlacementById,
  updatePlacement,
  updatePlacementStatus,
} from "@/lib/placements/placement.service";
import {
  updatePlacementSchema,
  updatePlacementStatusSchema,
  cleanPlacementInput,
} from "@/lib/placements/placement.validation";
import type { UpdatePlacementInput } from "@/types/placement";

// ─── GET /api/placements/[id] ────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "placements.view");

    const adminSupabase = createAdminClient();
    const placement = await getPlacementById(adminSupabase, id);

    if (!placement) {
      return NextResponse.json({ error: "Placement not found" }, { status: 404 });
    }

    if (placement.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Placement not found" }, { status: 404 });
    }

    return NextResponse.json({ data: placement });
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

// ─── PATCH /api/placements/[id] ──────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "placements.update");

    const body = await request.json();

    if ("new_status" in body) {
      const parsed = updatePlacementStatusSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.flatten() },
          { status: 400 },
        );
      }

      const adminSupabase = createAdminClient();
      const existing = await getPlacementById(adminSupabase, id);

      if (!existing) {
        return NextResponse.json({ error: "Placement not found" }, { status: 404 });
      }

      if (existing.centre_id !== ctx.centre.id) {
        return NextResponse.json({ error: "Placement not found" }, { status: 404 });
      }

      const previousStatus = existing.status;
      const updated = await updatePlacementStatus(
        adminSupabase,
        id,
        ctx.centre.id,
        parsed.data,
      );

      await auditUpdate(adminSupabase, ctx, "placement", existing.id, {
        status: previousStatus,
      }, {
        status: updated.status,
        reason: parsed.data.reason ?? null,
      });

      return NextResponse.json({ data: updated });
    }

    const cleaned = cleanPlacementInput(body);
    const parsed = updatePlacementSchema.safeParse(cleaned);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const adminSupabase = createAdminClient();
    const existing = await getPlacementById(adminSupabase, id);

    if (!existing) {
      return NextResponse.json({ error: "Placement not found" }, { status: 404 });
    }

    if (existing.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Placement not found" }, { status: 404 });
    }

    const updated = await updatePlacement(adminSupabase, id, parsed.data as UpdatePlacementInput);

    await auditUpdate(adminSupabase, ctx, "placement", existing.id,
      { bed_reference: existing.bed_reference, room_number: existing.room_number },
      { bed_reference: updated.bed_reference, room_number: updated.room_number },
    );

    return NextResponse.json({ data: updated });
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
