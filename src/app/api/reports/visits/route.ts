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
  allVisitsCountsByStatus,
  visitHistoryReport,
  upcomingVisitsReport,
} from "@/lib/reports/visits";

const TYPES = ["summary", "history", "upcoming", "by-status"] as const;
const FORMATS: ExportFormat[] = ["csv", "excel", "pdf"];

const TITLES: Record<(typeof TYPES)[number], string> = {
  summary: "Visits Summary by Status",
  history: "Visit History",
  upcoming: "Upcoming Visits",
  "by-status": "Visits by Status",
};

// ─── GET /api/reports/visits ────────────────────────────────
// ?type=summary|history|upcoming|by-status&format=csv|excel|pdf
// Gated by visits.view and scoped to the caller's centre.

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "visits.view");

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

    if (type === "summary" || type === "by-status") {
      rows = await allVisitsCountsByStatus(admin, centreId);
    } else if (type === "history") {
      rows = await visitHistoryReport(admin, centreId);
    } else if (type === "upcoming") {
      rows = await upcomingVisitsReport(admin, centreId);
    }

    return await respondWithExport(admin, ctx, {
      auditEntityType: "visits_report_export",
      reportType: type,
      title,
      rows,
      format,
      filename: `visits-${type}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
