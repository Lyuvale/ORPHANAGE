import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditUpdate } from "@/lib/audit/audit.service";
import {
  getHealthProfileById,
  updateHealthProfile,
} from "@/lib/health/health.service";
import {
  updateHealthProfileSchema,
  cleanHealthInput,
} from "@/lib/health/health.validation";

function statusFromError(message: string): number {
  if (message.includes("NOT_AUTHENTICATED")) return 401;
  if (message.includes("PERMISSION_DENIED")) return 403;
  if (message.includes("USER_DEACTIVATED") || message.includes("CENTRE_NOT_ACTIVE")) return 403;
  return 500;
}

// ─── GET /api/health/profiles/[id] ──────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "health.view");

    const adminSupabase = createAdminClient();
    const profile = await getHealthProfileById(adminSupabase, id);

    if (!profile || profile.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Health profile not found" }, { status: 404 });
    }

    return NextResponse.json({ data: profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}

// ─── PATCH /api/health/profiles/[id] ────────────────────────

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
    const existing = await getHealthProfileById(adminSupabase, id);

    if (!existing || existing.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Health profile not found" }, { status: 404 });
    }

    const body = await request.json();
    const cleaned = cleanHealthInput(body);
    const parsed = updateHealthProfileSchema.safeParse(cleaned);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const updated = await updateHealthProfile(
      adminSupabase,
      id,
      parsed.data as import("@/types/health").UpdateHealthProfileInput,
    );

    await auditUpdate(adminSupabase, ctx, "health_profile", id, {
      child_id: existing.child_id,
      has_blood_group: existing.blood_group !== null,
      allergy_count: existing.allergies.length,
    }, {
      has_blood_group: updated.blood_group !== null,
      allergy_count: updated.allergies.length,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
