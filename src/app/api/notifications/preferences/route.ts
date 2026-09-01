import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission, getUserRoleName } from "@/lib/auth/authorization.service";
import { listPreferences, setPreference } from "@/lib/notifications/notifications.service";
import { setPreferenceSchema } from "@/lib/notifications/notifications.validation";

// ─── GET /api/notifications/preferences ─────────────────────

export async function GET() {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    const role = await getUserRoleName(supabase as unknown as SupabaseClient, ctx);
    const isAdmin = role === "PLATFORM_ADMINISTRATOR";

    if (isAdmin) {
      await requirePermission(supabase as unknown as SupabaseClient, ctx, "audit.view");
    } else {
      await requirePermission(supabase as unknown as SupabaseClient, ctx, "notifications.view");
    }

    const adminSupabase = createAdminClient();
    const data = await listPreferences(adminSupabase, ctx.profile.id);
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("NOT_AUTHENTICATED") ? 401
      : message.includes("PERMISSION_DENIED") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// ─── PATCH /api/notifications/preferences ────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    const role = await getUserRoleName(supabase as unknown as SupabaseClient, ctx);
    const isAdmin = role === "PLATFORM_ADMINISTRATOR";

    if (isAdmin) {
      await requirePermission(supabase as unknown as SupabaseClient, ctx, "audit.view");
    } else {
      await requirePermission(supabase as unknown as SupabaseClient, ctx, "notifications.view");
    }

    const body = await request.json();
    const parsed = setPreferenceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const adminSupabase = createAdminClient();
    const data = await setPreference(
      adminSupabase,
      ctx.profile.id,
      parsed.data.event_type,
      parsed.data.enabled,
    );
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("NOT_AUTHENTICATED") ? 401
      : message.includes("PERMISSION_DENIED") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
