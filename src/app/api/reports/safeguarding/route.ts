import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { statusFromError } from "@/lib/resources/route-helpers";
import type { ReportRows } from "@/lib/resources/reports";
import { respondWithExport } from "@/lib/reports/export-response";
import type { ExportFormat } from "@/lib/reports/export";
import {
  childLabels,
  safeguardingConcernRows,
  safeguardingActionRows,
  concernsSummaryRows,
  concernsBySeverityRows,
  concernsSafeRows,
  actionsRows,
} from "@/lib/reports/safeguarding";

const TYPES = ["summary", "concerns", "actions", "by-severity"] as const;
const FORMATS: ExportFormat[] = ["csv", "excel", "pdf"];

const TITLES: Record<(typeof TYPES)[number], string> = {
  summary: "Safeguarding Summary",
  concerns: "Safeguarding Concerns (Safe Summary)",
  actions: "Safeguarding Actions",
  "by-severity": "Safeguarding by Severity",
};

// ─── GET /api/reports/safeguarding ───────────────────────────
// ?type=summary|concerns|actions|by-severity&format=csv|excel|pdf
// Gated by safeguarding.view (sensitive) and scoped to the caller's centre.
// Only SAFE SUMMARY fields are exported — never raw narrative/descriptions.

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "safeguarding.view");

    const type = request.nextUrl.searchParams.get("type") || "summary";
    const formatParam = request.nextUrl.searchParams.get("format") || "csv";

    if (!(TYPES as readonly string[]).includes(type)) {
      return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
    }
    if (!(FORMATS as readonly string[]).includes(formatParam as ExportFormat)) {
      return NextResponse.json({ error: "Invalid report format" }, { status: 400 });
    }

    const admin = createAdminClient();
    const centreId = ctx.centre.id;
    const format = formatParam as ExportFormat;

    let rows: ReportRows = [];
    const title = TITLES[type as (typeof TYPES)[number]];

    if (type === "summary") {
      const concerns = await safeguardingConcernRows(admin, centreId);
      rows = concernsSummaryRows(concerns);
    } else if (type === "by-severity") {
      const concerns = await safeguardingConcernRows(admin, centreId);
      rows = concernsBySeverityRows(concerns);
    } else if (type === "concerns") {
      const concerns = await safeguardingConcernRows(admin, centreId);
      const children = await childLabels(admin, centreId);
      rows = concernsSafeRows(concerns, children);
    } else if (type === "actions") {
      const actions = await safeguardingActionRows(admin, centreId);
      const concerns = await safeguardingConcernRows(admin, centreId);
      const children = await childLabels(admin, centreId);
      const labelMap = new Map<string, string>();
      for (const c of concerns) {
        labelMap.set(c.id, children.get(c.child_id) ?? "Unknown");
      }
      rows = actionsRows(actions, labelMap);
    }

    return await respondWithExport(admin, ctx, {
      auditEntityType: "safeguarding_report_export",
      reportType: type,
      title,
      rows,
      format,
      filename: `safeguarding-${type}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
