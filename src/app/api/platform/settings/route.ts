import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { recordAuditEvent } from "@/lib/audit/audit.service";
import { statusFromError } from "@/lib/resources/route-helpers";

/**
 * GET /api/platform/settings
 * PLATFORM ADMIN: read platform settings (platform.settings).
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient, {
      allowInactiveSubscription: true,
    });
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "platform.settings");

    const admin = createAdminClient();

    const { data: settings, error } = await admin
      .from("platform_settings")
      .select("key, value, description")
      .order("key", { ascending: true });

    if (error) {
      return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
    }

    const { data: centreConfigs } = await admin
      .from("centre_online_contributions")
      .select("centre_id, enabled, purpose_presets, default_purpose");

    return NextResponse.json({
      data: {
        settings: settings ?? [],
        online_contribution_centres: centreConfigs ?? [],
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}

/**
 * PATCH /api/platform/settings
 * PLATFORM ADMIN: update platform settings (platform.settings).
 * Supports toggling the master "online_contributions_enabled" switch.
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient, {
      allowInactiveSubscription: true,
    });
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "platform.settings");

    const body = (await request.json()) as {
      online_contributions_enabled?: boolean;
    };

    const admin = createAdminClient();

    const upserts: { key: string; value: unknown }[] = [];
    const changes: Record<string, unknown> = {};

    if (typeof body.online_contributions_enabled === "boolean") {
      upserts.push({ key: "online_contributions_enabled", value: body.online_contributions_enabled });
      changes.online_contributions_enabled = body.online_contributions_enabled;
    }

    if (upserts.length === 0) {
      return NextResponse.json({ error: "V_INVALID: no valid settings provided" }, { status: 400 });
    }

    for (const u of upserts) {
      await admin
        .from("platform_settings")
        .upsert({ key: u.key, value: JSON.stringify(u.value) }, { onConflict: "key" });
    }

    await recordAuditEvent(admin, ctx, {
      action: "PLATFORM_SETTINGS_UPDATED",
      entity_type: "platform",
      new_values: changes,
    });

    return NextResponse.json({ data: changes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
