/**
 * Shared report / export helpers.
 *
 * Every section exposes its own "Report / Export" action that calls a
 * `/api/reports/<section>` route. Those routes build simple row/column data
 * and produce a download via these helpers. There is NO standalone Reports
 * module — each route is permission-gated by the SECTION's own view
 * permission and scoped to the caller's centre (tenant isolation).
 *
 * The generators (CSV / Excel / PDF) are dependency-free and reused from the
 * Resources & Support module so every section delivers the same output.
 */
import {
  toCsv,
  toExcelHtml,
  toMinimalPdf,
  type ReportColumn,
  type ReportRows,
} from "@/lib/resources/reports";

export type ExportFormat = "csv" | "excel" | "pdf";

export const EXPORT_FORMATS: ExportFormat[] = ["csv", "excel", "pdf"];

export interface BuiltExport {
  body: Buffer | string;
  contentType: string;
  filename: string;
}

/** Derive display columns from the keys of the first row (stable order). */
export function columnsFromRows(rows: ReportRows): ReportColumn[] {
  return rows.length > 0
    ? Object.keys(rows[0]).map((k) => ({ key: k, label: k }))
    : [];
}

/** Build a downloadable body for the requested format. */
export function buildExport(
  title: string,
  rows: ReportRows,
  format: ExportFormat,
  filename: string,
): BuiltExport {
  const columns = columnsFromRows(rows);

  if (format === "excel") {
    return {
      body: toExcelHtml(title, columns, rows),
      contentType: "application/vnd.ms-excel",
      filename: `${filename}.xls`,
    };
  }
  if (format === "pdf") {
    return {
      body: toMinimalPdf(title, columns, rows),
      contentType: "application/pdf",
      filename: `${filename}.pdf`,
    };
  }
  return {
    body: toCsv(columns, rows),
    contentType: "text/csv; charset=utf-8",
    filename: `${filename}.csv`,
  };
}
