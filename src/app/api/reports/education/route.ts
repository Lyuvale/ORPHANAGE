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
  profilesRows,
  goalsRows,
  progressRows,
  supportNeedsRows,
  achievementsRows,
  educationSummaryRows,
} from "@/lib/reports/education";

const TYPES = [
  "profiles",
  "goals",
  "progress",
  "support-needs",
  "achievements",
  "summary",
] as const;
const FORMATS: ExportFormat[] = ["csv", "excel", "pdf"];

const TITLES: Record<(typeof TYPES)[number], string> = {
  profiles: "Education Profiles",
  goals: "Development Goals",
  progress: "Progress Updates",
  "support-needs": "Education Support Needs",
  achievements: "Achievements",
  summary: "Education & Development Summary",
};

// ─── GET /api/reports/education ──────────────────────────────
// ?type=profiles|goals|progress|support-needs|achievements|summary&format=csv|excel|pdf
// Gated by education_development.view and scoped to the caller's centre.

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "education_development.view");

    const type = request.nextUrl.searchParams.get("type") || "profiles";
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

    if (type === "profiles") {
      rows = await profilesRows(admin, centreId);
    } else if (type === "goals") {
      rows = await goalsRows(admin, centreId);
    } else if (type === "progress") {
      rows = await progressRows(admin, centreId);
    } else if (type === "support-needs") {
      rows = await supportNeedsRows(admin, centreId);
    } else if (type === "achievements") {
      rows = await achievementsRows(admin, centreId);
    } else if (type === "summary") {
      rows = await educationSummaryRows(admin, centreId);
    }

    return await respondWithExport(admin, ctx, {
      auditEntityType: "education_report_export",
      reportType: type,
      title,
      rows,
      format,
      filename: `education-${type}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}