import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { can } from "@/lib/auth/authorization.service";
import { auditUpdate } from "@/lib/audit/audit.service";
import { getAdmissionById } from "@/lib/admissions/admission.service";
import { getChildById } from "@/lib/children/child.service";

function statusFromError(message: string): number {
  if (message.includes("NOT_AUTHENTICATED")) return 401;
  if (message.includes("PERMISSION_DENIED")) return 403;
  if (message.includes("USER_DEACTIVATED") || message.includes("CENTRE_NOT_ACTIVE")) return 403;
  return 500;
}

// ─── POST /api/admissions/[id]/link ──────────────────────────
// Link an approved admission (and its referral) to the officially registered
// child. Used by the Records Officer right after registering the child, so
// referral + admission + placement + guardians live together on the child.
// Allowed for admission creators (submit side) and reviewers (approval side);
// approval itself still requires admissions.review on the status route.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);

    const mayCreate = await can(supabase as unknown as SupabaseClient, ctx, "admissions.create");
    const mayReview = await can(supabase as unknown as SupabaseClient, ctx, "admissions.review");
    if (!mayCreate && !mayReview) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const body = (await request.json()) as { child_id?: string };
    if (!body.child_id) {
      return NextResponse.json({ error: "child_id is required." }, { status: 400 });
    }

    const admin = createAdminClient();
    const admission = await getAdmissionById(admin, id);
    if (!admission || admission.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Admission not found." }, { status: 404 });
    }

    const child = await getChildById(admin, body.child_id);
    if (!child || child.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Child not found." }, { status: 404 });
    }

    const { error: admError } = await admin
      .from("admissions")
      .update({ child_id: child.id })
      .eq("id", admission.id);
    if (admError) {
      return NextResponse.json({ error: "Failed to link admission." }, { status: 500 });
    }

    // Link the referral behind this admission as well (child hub shows both).
    await admin
      .from("referrals")
      .update({ child_id: child.id })
      .eq("id", admission.referral_id)
      .eq("centre_id", ctx.centre.id);

    await auditUpdate(
      admin,
      ctx,
      "admission",
      admission.id,
      { child_id: (admission as { child_id?: string | null }).child_id ?? null },
      { child_id: child.id },
    );

    return NextResponse.json({ data: { admission_id: admission.id, child_id: child.id } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
