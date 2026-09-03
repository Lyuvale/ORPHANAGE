import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { getUserRoleName } from "@/lib/auth/authorization.service";
import {
  finalizeExpiredSubscription,
  runExpiryChecks,
} from "@/lib/subscriptions/subscription-access.service";

function statusFromError(message: string): number {
  if (message.includes("NOT_AUTHENTICATED")) return 401;
  if (message.includes("PERMISSION_DENIED")) return 403;
  if (message.includes("USER_DEACTIVATED") || message.includes("CENTRE_NOT_ACTIVE") || message.includes("SUBSCRIPTION_INACTIVE")) return 403;
  return 500;
}

// ─── POST /api/subscriptions/check-expiry ─────────────────────
// Finalize expired subscriptions:
//   - CENTRE_MANAGER: scoped to their OWN centre only (no cross-centre data).
//     A centre whose plan period is over is transitioned to `expired`,
//     making the centre inactive in the database.
//   - PLATFORM_ADMINISTRATOR: platform-wide expiry sweep (counts + alerts).
// Safe to call on demand (or from a future scheduled job).

export async function POST() {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient, {
      allowInactiveSubscription: true,
    });
    const roleName = await getUserRoleName(supabase as unknown as SupabaseClient, ctx);

    const admin = createAdminClient();

    if (roleName === "CENTRE_MANAGER") {
      const result = await finalizeExpiredSubscription(admin, ctx.centre.id);
      return NextResponse.json({ data: result });
    }

    if (roleName === "PLATFORM_ADMINISTRATOR") {
      const report = await runExpiryChecks(admin);
      return NextResponse.json({ data: report });
    }

    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
