import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditCreate } from "@/lib/audit/audit.service";
import {
  getHealthProfile,
  createHealthProfile,
} from "@/lib/health/health.service";
import {
  createHealthProfileSchema,
  cleanHealthInput,
} from "@/lib/health/health.validation";
import type { CreateHealthProfileInput } from "@/types/health";

function statusFromError(message: string): number {
  if (message.includes("NOT_AUTHENTICATED")) return 401;
  if (message.includes("PERMISSION_DENIED")) return 403;
  if (message.includes("USER_DEACTIVATED") || message.includes("CENTRE_NOT_ACTIVE")) return 403;
  return 500;
}

// ─── GET /api/health/profiles?child_id= ─────────────────────

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "health.view");

    const childId = request.nextUrl.searchParams.get("child_id");
    if (!childId) {
      return NextResponse.json({ error: "child_id is required" }, { status: 400 });
    }

    const adminSupabase = createAdminClient();
    const profile = await getHealthProfile(adminSupabase, ctx.centre.id, childId);

    return NextResponse.json({ data: profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}

// ─── POST /api/health/profiles ──────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "health.create");

    const body = await request.json();
    const cleaned = cleanHealthInput(body);
    const parsed = createHealthProfileSchema.safeParse(cleaned);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    if (parsed.data.centre_id !== ctx.centre.id) {
      return NextResponse.json(
        { error: "Cannot create a health profile for another centre" },
        { status: 403 },
      );
    }

    const adminSupabase = createAdminClient();
    const profile = await createHealthProfile(
      adminSupabase,
      parsed.data as CreateHealthProfileInput,
    );

    await auditCreate(adminSupabase, ctx, "health_profile", profile.id, {
      child_id: profile.child_id,
      has_blood_group: profile.blood_group !== null,
      allergy_count: profile.allergies.length,
      condition_count: profile.medical_conditions.length,
    });

    return NextResponse.json({ data: profile }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
