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
  caseSummaryReport,
  openCasesReport,
  casesByStatusReport,
} from "@/lib/reports/cases";

const TYPES = ["summary", "open-cases", "by-status"] as const;
const FORMATS: ExportFormat[] = ["csv", "excel", "pdf"];

const TITLES: Record<(typeof TYPES)[number], string> = {
  summary: "Case Summary by Status",
  "open-cases": "Open Cases",
  "by-status": "Cases by Status",
};

// ─── GET /api/reports/cases ─────────────────────────────────
// ?type=summary|open-cases|by-status&format=csv|excel|pdf
// Gated by cases.view (sensitive) and scoped to the caller's centre.

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "cases.view");

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
      rows = await caseSummaryReport(admin, centreId);
    } else if (type === "open-cases") {
      rows = await openCasesReport(admin, centreId);
    } else if (type === "by-status") {
      rows = await casesByStatusReport(admin, centreId);
    }

    return await respondWithExport(admin, ctx, {
      auditEntityType: "cases_report_export",
      reportType: type,
      title,
      rows,
      format,
      filename: `cases-${type}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
