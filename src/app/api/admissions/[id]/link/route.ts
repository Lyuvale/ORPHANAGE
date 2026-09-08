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

    // Auto-link guardians submitted with this referral, so the records
    // officer never re-types them: first one primary (unless one exists).
    let linkedGuardians = 0;
    try {
      const { data: refGuardians } = await admin
        .from("guardians")
        .select("id")
        .eq("centre_id", ctx.centre.id)
        .eq("referral_id", admission.referral_id);
      const guardianIds = ((refGuardians ?? []) as { id: string }[]).map((g) => g.id);
      if (guardianIds.length > 0) {
        const { data: existingRels } = await admin
          .from("child_guardians")
          .select("id, guardian_id, is_primary")
          .eq("centre_id", ctx.centre.id)
          .eq("child_id", child.id)
          .eq("is_active", true);
        const linked = new Set(
          ((existingRels ?? []) as { guardian_id: string }[]).map((r) => r.guardian_id),
        );
        const hasPrimary = ((existingRels ?? []) as { is_primary: boolean }[]).some(
          (r) => r.is_primary,
        );
        let primaryGiven = hasPrimary;
        for (const gid of guardianIds) {
          if (linked.has(gid)) continue;
          const makePrimary = !primaryGiven;
          primaryGiven = true;
          const { error: relError } = await admin.from("child_guardians").insert({
            centre_id: ctx.centre.id,
            child_id: child.id,
            guardian_id: gid,
            relationship_type: "other_authorised",
            is_primary: makePrimary,
            is_active: true,
          });
          if (!relError) linkedGuardians += 1;
        }
      }
    } catch {
      // Guardian auto-link must not break the admission link.
    }

    await auditUpdate(
      admin,
      ctx,
      "admission",
      admission.id,
      { child_id: (admission as { child_id?: string | null }).child_id ?? null },
      { child_id: child.id },
    );

    return NextResponse.json({
      data: { admission_id: admission.id, child_id: child.id, linked_guardians: linkedGuardians },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
