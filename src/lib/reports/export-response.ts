/**
 * Shared helper for section report/export routes.
 *
 * Handles the common tail of an export: build the downloadable body for the
 * requested format and record an EXPORT audit event. Data loading, permission
 * checks and tenant scoping remain the responsibility of each section route.
 */
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppUserContext } from "@/lib/auth/app-user-context";
import { recordAuditEvent } from "@/lib/audit/audit.service";
import { buildExport, type ExportFormat, type BuiltExport } from "@/lib/reports/export";
import type { ReportRows } from "@/lib/resources/reports";

/**
 * Build and return a download response, recording an EXPORT audit event.
 *
 * @param adminSupabase service-role client
 * @param ctx authenticated user context (provides centre + actor)
 * @param opts report metadata used for the audit trail and file naming
 */
export async function respondWithExport(
  adminSupabase: SupabaseClient,
  ctx: AppUserContext,
  opts: {
    auditEntityType: string;
    reportType: string;
    title: string;
    rows: ReportRows;
    format: ExportFormat;
    filename: string;
  },
): Promise<NextResponse> {
  const built: BuiltExport = buildExport(opts.title, opts.rows, opts.format, opts.filename);

  // Audit the export: who, which section/report, when, and in what format.
  await recordAuditEvent(adminSupabase, ctx, {
    action: "EXPORT",
    entity_type: opts.auditEntityType,
    entity_id: ctx.centre.id,
    new_values: { report_type: opts.reportType, format: opts.format },
  });

  return new NextResponse(built.body as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": built.contentType,
      "Content-Disposition": `attachment; filename="${built.filename}"`,
    },
  });
}
