import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { listUserProfiles } from "@/lib/users/user-profile.service";
import type { UserProfileStatus } from "@/types/user-profile";

function statusFromError(message: string): number {
  if (message.includes("NOT_AUTHENTICATED")) return 401;
  if (message.includes("PERMISSION_DENIED")) return 403;
  if (message.includes("USER_DEACTIVATED") || message.includes("CENTRE_NOT_ACTIVE")) return 403;
  return 500;
}

// ─── GET /api/staff/users ────────────────────────────────────
// Lists user profiles in the current centre (active only by default)
// so a staff profile can be linked to an existing platform user.

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "staff.create");

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? undefined;
    const statusParam = searchParams.get("status") ?? "active";
    const status: UserProfileStatus | undefined =
      statusParam === "active" ? "active" : statusParam === "all" ? undefined : "active";
    const limitRaw = parseInt(searchParams.get("limit") ?? "50", 10);
    const limit = isNaN(limitRaw) ? 50 : Math.min(Math.max(limitRaw, 1), 200);
    const offsetRaw = parseInt(searchParams.get("offset") ?? "0", 10);
    const offset = isNaN(offsetRaw) ? 0 : Math.max(offsetRaw, 0);

    const { data, count } = await listUserProfiles({
      centre_id: ctx.centre.id,
      status,
      search,
      limit,
      offset,
    });

    return NextResponse.json({ data, count });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}