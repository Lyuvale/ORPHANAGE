import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditUpdate } from "@/lib/audit/audit.service";
import {
  getRelationshipById,
  updateRelationship,
  endRelationship,
} from "@/lib/guardians/guardian.service";
import {
  updateRelationshipSchema,
  endRelationshipSchema,
  cleanGuardianInput,
} from "@/lib/guardians/guardian.validation";
import type { UpdateRelationshipInput } from "@/types/guardian";

// ─── GET /api/guardians/relationships/[id] ───────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "guardians.view");

    const adminSupabase = createAdminClient();
    const relationship = await getRelationshipById(adminSupabase, id);

    if (!relationship) {
      return NextResponse.json({ error: "Relationship not found" }, { status: 404 });
    }

    if (relationship.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Relationship not found" }, { status: 404 });
    }

    return NextResponse.json({ data: relationship });
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

// ─── PATCH /api/guardians/relationships/[id] ─────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "guardians.relationship.manage");

    const body = await request.json();

    // Check if this is an "end relationship" request
    if ("end_date" in body || (body.is_active === false)) {
      const parsed = endRelationshipSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.flatten() },
          { status: 400 },
        );
      }

      const adminSupabase = createAdminClient();
      const existing = await getRelationshipById(adminSupabase, id);

      if (!existing) {
        return NextResponse.json({ error: "Relationship not found" }, { status: 404 });
      }

      if (existing.centre_id !== ctx.centre.id) {
        return NextResponse.json({ error: "Relationship not found" }, { status: 404 });
      }

      const previous = { ...existing };
      const updated = await endRelationship(adminSupabase, id, ctx.centre.id, parsed.data);

      await auditUpdate(adminSupabase, ctx, "child_guardian", existing.id,
        { is_active: previous.is_active, is_primary: previous.is_primary },
        { is_active: false, is_primary: false, end_date: updated.end_date },
      );

      return NextResponse.json({ data: updated });
    }

    const cleaned = cleanGuardianInput(body);
    const parsed = updateRelationshipSchema.safeParse(cleaned);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const adminSupabase = createAdminClient();
    const existing = await getRelationshipById(adminSupabase, id);

    if (!existing) {
      return NextResponse.json({ error: "Relationship not found" }, { status: 404 });
    }

    if (existing.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Relationship not found" }, { status: 404 });
    }

    const updated = await updateRelationship(adminSupabase, id, parsed.data as UpdateRelationshipInput);

    await auditUpdate(adminSupabase, ctx, "child_guardian", existing.id,
      { relationship_type: existing.relationship_type, is_primary: existing.is_primary },
      { relationship_type: updated.relationship_type, is_primary: updated.is_primary },
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
