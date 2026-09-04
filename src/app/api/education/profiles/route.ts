import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { caregiverAssignmentScope } from "@/lib/caregivers/caregiver.service";
import { auditCreate } from "@/lib/audit/audit.service";
import {
  getEducationProfile,
  createEducationProfile,
} from "@/lib/education/education.service";
import {
  createEducationProfileSchema,
  cleanEducationInput,
} from "@/lib/education/education.validation";
import type { CreateEducationProfileInput } from "@/types/education";

function statusFromError(message: string): number {
  if (message.includes("NOT_AUTHENTICATED")) return 401;
  if (message.includes("PERMISSION_DENIED")) return 403;
  if (message.includes("USER_DEACTIVATED") || message.includes("CENTRE_NOT_ACTIVE")) return 403;
  return 500;
}

// ─── GET /api/education/profiles?child_id= ───────────────────

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "education_development.view");

    const childId = request.nextUrl.searchParams.get("child_id");
    if (!childId) {
      return NextResponse.json({ error: "child_id is required" }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    // Spec: a caregiver opens ASSIGNED CHILDREN ONLY.
    const { assignedIds } = await caregiverAssignmentScope(
      adminSupabase,
      supabase as unknown as SupabaseClient,
      ctx,
    );
    if (assignedIds && !assignedIds.includes(childId)) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 });
    }

    const profile = await getEducationProfile(adminSupabase, ctx.centre.id, childId);

    return NextResponse.json({ data: profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}

// ─── POST /api/education/profiles ────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "education_development.education.manage");

    const body = await request.json();
    const cleaned = cleanEducationInput(body);
    const parsed = createEducationProfileSchema.safeParse(cleaned);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    if (parsed.data.centre_id !== ctx.centre.id) {
      return NextResponse.json(
        { error: "Cannot create an education profile for another centre" },
        { status: 403 },
      );
    }

    const adminSupabase = createAdminClient();
    const profile = await createEducationProfile(
      adminSupabase,
      parsed.data as CreateEducationProfileInput,
      ctx.profile.id,
    );

    await auditCreate(adminSupabase, ctx, "education_profile", profile.id, {
      child_id: profile.child_id,
      education_status: profile.education_status,
    });

    return NextResponse.json({ data: profile }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
