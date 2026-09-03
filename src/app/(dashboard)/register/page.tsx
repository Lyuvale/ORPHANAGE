import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { can } from "@/lib/auth/authorization.service";
import RegisterClient from "./RegisterClient";

// Unified intake page: referral + child + guardian (+ link) + admission +
// placement in one registration flow. Each section is shown only when the
// signed-in user is permitted to create that record (role-based visibility,
// enforced here and again by each POST route). Users with no creation rights
// at all are sent back to the children list.
export default async function RegisterPage() {
  const supabase = await createClient();
  const ctx = await requireAppAccess(supabase as never);

  const [canReferral, canChild, canGuardian, canLink, canAdmission, canPlacement] =
    await Promise.all([
      can(supabase as never, ctx, "referrals.create"),
      can(supabase as never, ctx, "children.create"),
      can(supabase as never, ctx, "guardians.create"),
      can(supabase as never, ctx, "guardians.relationship.manage"),
      can(supabase as never, ctx, "admissions.create"),
      can(supabase as never, ctx, "placements.create"),
    ]);

  if (!canReferral && !canChild && !canGuardian && !canAdmission && !canPlacement) {
    redirect("/children");
  }

  return (
    <RegisterClient
      centreId={ctx.centre.id}
      centreName={ctx.centre.name}
      caps={{
        referral: canReferral,
        child: canChild,
        guardian: canGuardian,
        link: canLink,
        admission: canAdmission,
        placement: canPlacement,
      }}
    />
  );
}
