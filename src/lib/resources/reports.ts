/**
 * Lightweight, dependency-free report generators for the Resources &
 * Support module. Produces CSV, Excel-compatible HTML (.xls) and a
 * minimal PDF — all driven by simple row/column data.
 */
import { formatTsh, getSourceTypeDisplay, getExpenseStatusDisplay, getBenefitTypeDisplay } from "@/types/resources";

export interface ReportColumn {
  key: string;
  label: string;
}

export interface ReportRow {
  [key: string]: string | number;
}

export type ReportRows = ReportRow[];

function esc(value: string): string {
  return (value ?? "")
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── CSV ─────────────────────────────────────────────────────

export function toCsv(columns: ReportColumn[], rows: ReportRows): string {
  const header = columns.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(",");
  const body = rows.map((row) =>
    columns.map((c) => {
      const v = row[c.key] ?? "";
      return `"${String(v).replace(/"/g, '""')}"`;
    }).join(","),
  );
  return [header, ...body].join("\r\n");
}

// ─── Excel (.xls as HTML table) ──────────────────────────────

export function toExcelHtml(title: string, columns: ReportColumn[], rows: ReportRows): string {
  const head = `<tr>${columns.map((c) => `<th>${esc(c.label)}</th>`).join("")}</tr>`;
  const body = rows
    .map(
      (row) =>
        `<tr>${columns.map((c) => `<td>${esc(String(row[c.key] ?? ""))}</td>`).join("")}</tr>`,
    )
    .join("");
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="utf-8">
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>${esc(title)}</x:Name>
<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
</head><body><table><thead>${head}</thead><tbody>${body}</tbody></table></body></html>`;
}

// ─── Minimal PDF ─────────────────────────────────────────────

/**
 * A tiny PDF generator for simple, text/table reports.
 * Produces a single-page layout with a title and a table.
 */
export function toMinimalPdf(title: string, columns: ReportColumn[], rows: ReportRows): Buffer {
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 40;
  const titleFontSize = 14;
  const lineHeight = 13;
  const usableWidth = pageWidth - margin * 2;

  // Build a flat list of text lines in PDF content-stream syntax.
  const lines: string[] = [];

  const pushText = (size: number, x: number, y: number, text: string, font: string) => {
    lines.push("BT");
    lines.push(`/${font} ${size} Tf`);
    lines.push(`${x} ${y} Td`);
    lines.push(`(${sanitizePdf(text)}) Tj`);
    lines.push("ET");
  };

  pushText(titleFontSize, margin, pageHeight - margin - titleFontSize, title, "F2");

  // Column widths (proportional, clamped).
  const colWidths = columns.map((c) => {
    const labelW = c.label.length * 6;
    const dataW = rows.reduce((m, r) => Math.max(m, String(r[c.key] ?? "").length * 5), 0);
    return Math.min(Math.max(labelW + 10, dataW + 10), 220);
  });
  const totalW = colWidths.reduce((a, b) => a + b, 0);
  const scale = totalW > usableWidth ? usableWidth / totalW : 1;
  const widths = colWidths.map((w) => w * scale);

  let y = pageHeight - margin - titleFontSize - 30;

  // Header row.
  let headerText = "";
  for (let i = 0; i < columns.length; i++) {
    headerText += columns[i].label;
    if (i < columns.length - 1) headerText += " ".repeat(Math.max(6, widths[i] / 4.5));
  }
  pushText(8, margin, y, headerText, "F1");
  y -= lineHeight;

  // Data rows.
  for (const row of rows) {
    let rowText = "";
    for (let i = 0; i < columns.length; i++) {
      const cell = String(row[columns[i].key] ?? "");
      const cellText = cell.length > 40 ? cell.slice(0, 37) + "..." : cell;
      rowText += cellText;
      if (i < columns.length - 1) {
        const pad = Math.max(6, Math.round(widths[i] / 4.5) - cellText.length);
        rowText += " ".repeat(pad);
      }
    }
    pushText(8, margin, y, rowText, "F1");
    y -= lineHeight;
    if (y < margin + 20) {
      // New "page": add a form feed by starting fresh content stream handled by buildPdf pagination.
      y = pageHeight - margin - 30;
      lines.push("Q"); // end graphics state (no-op placeholder for page break)
      lines.push("q");
    }
  }

  // Paginate: split content into chunks not exceeding one page height.
  const chunks: string[] = [];
  let current: string[] = [];
  let currentUsage = 0;
  const maxUsage = pageHeight - margin * 2 - titleFontSize - 30;
  for (const line of lines) {
    if (line === "Q" || line === "q") {
      chunks.push(current.join("\n"));
      current = [];
      currentUsage = 0;
      continue;
    }
    current.push(line);
    currentUsage += 1;
    if (currentUsage > maxUsage / 6) {
      chunks.push(current.join("\n"));
      current = [];
      currentUsage = 0;
    }
  }
  if (current.length > 0) chunks.push(current.join("\n"));

  return buildPdf(chunks);
}

function streamDef(stream: string): string {
  return `<< /Length ${countBytes(stream)} >>\nstream\n${stream}\nendstream`;
}

function buildPdf(
  chunks: string[],
): Buffer {
  const header = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const streamCount = chunks.length;
  const pageObj = streamCount + 1;
  const pagesObj = streamCount + 2;
  const catalogObj = streamCount + 3;
  const fontObj = streamCount + 4;
  const numObjects = streamCount + 4;

  const entries: string[] = [];
  const offsets = new Map<number, number>();
  let currentOffset = Buffer.byteLength(header, "latin1");

  const place = (body: string): void => {
    const start = currentOffset;
    const entry = `${entries.length + 1} 0 obj\n${body}\nendobj\n`;
    entries.push(entry);
    offsets.set(entries.length, start);
    currentOffset += Buffer.byteLength(entry, "latin1");
  };

  const pageRefs = chunks.map((_, i) => `${i + 1} 0 R`).join(" ");
  for (const s of chunks) {
    place(streamDef(s));
  }
  place(
    `<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontObj} 0 R /F2 ${fontObj} 0 R >> >> /Contents [${pageRefs}] >>`,
  );
  place(`<< /Type /Pages /Kids [${pageObj} 0 R] /Count 1 >>`);
  place(`<< /Type /Catalog /Pages ${pagesObj} 0 R >>`);
  place(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`);

  // xref
  const xrefOffset = currentOffset;
  let xref = `xref\n0 ${numObjects + 1}\n`;
  xref += `0000000000 65535 f \n`;
  const sorted = new Map([...offsets].sort((a, b) => a[0] - b[0]));
  for (let i = 1; i <= numObjects; i++) {
    xref += `${String(sorted.get(i) ?? 0).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${numObjects + 1} /Root ${catalogObj} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  const all = header + entries.join("") + xref;
  return Buffer.from(all, "latin1");
}

function countBytes(s: string): number {
  return Buffer.byteLength(s, "latin1");
}

function sanitizePdf(s: string): string {
  return s
    .replace(/[\\()]/g, (m) => `\\${m}`)
    .replace(/[^\x20-\x7E]/g, " ");
}

// ─── Report row builders ─────────────────────────────────────

export function sourceReportRows(sources: {
  source_name: string;
  source_type: string;
  amount: number;
  funds: { fund_name: string; amount_allocated: number }[];
}[]): ReportRows {
  return sources.map((s) => ({
    source_name: s.source_name,
    source_type: getSourceTypeDisplay(s.source_type as never),
    received: formatTsh(s.amount),
    allocated: formatTsh(s.funds.reduce((a, f) => a + f.amount_allocated, 0)),
    funds: s.funds.map((f) => f.fund_name).join("; "),
  }));
}

export function fundReportRows(
  funds: { fund_name: string; amount_allocated: number; used: number; source?: { source_name?: string } | null }[],
): ReportRows {
  return funds.map((f) => ({
    fund_name: f.fund_name,
    source: f.source?.source_name ?? "-",
    received: formatTsh(f.amount_allocated),
    used: formatTsh(f.used),
    balance: formatTsh((Number(f.amount_allocated) || 0) - (Number(f.used) || 0)),
  }));
}

export function expenseReportRows(
  expenses: { description: string; amount: number; expense_date?: string | null; approval_status: string; fund?: { fund_name?: string } | null; benefits?: { benefit_type?: string }[] }[],
): ReportRows {
  return expenses.map((e) => ({
    description: e.description,
    fund: e.fund?.fund_name ?? "-",
    amount: formatTsh(e.amount),
    status: getExpenseStatusDisplay(e.approval_status as never),
    benefits: (e.benefits ?? []).map((b) => getBenefitTypeDisplay(b.benefit_type as never)).join("; "),
  }));
}

export function benefitReportRows(
  benefits: { benefit_type: string; description?: string | null; children?: { reference_number: string; first_name: string; last_name: string }[]; expense?: { description?: string; fund?: { fund_name?: string } | null; amount?: number } | null }[],
): ReportRows {
  return benefits.map((b) => ({
    benefit: getBenefitTypeDisplay(b.benefit_type as never),
    description: b.description ?? "-",
    expense: b.expense?.description ?? "-",
    fund: b.expense?.fund?.fund_name ?? "-",
    amount: formatTsh(b.expense?.amount ?? 0),
    children: (b.children ?? []).map((c) => `${c.first_name} ${c.last_name} (${c.reference_number})`).join("; "),
  }));
}

export function childReportRows(
  children: { reference_number: string; first_name: string; last_name: string; benefits: { benefit_type: string; expense?: { description?: string; fund?: { fund_name?: string; source?: { source_name?: string } | null } | null } | null }[] }[],
): ReportRows {
  return children.map((c) => ({
    child: `${c.first_name} ${c.last_name} (${c.reference_number})`,
    benefits: (c.benefits ?? [])
      .map((b) => getBenefitTypeDisplay(b.benefit_type as never))
      .join("; "),
    sources: Array.from(
      new Set(
        (c.benefits ?? [])
          .map((b) => b.expense?.fund?.source?.source_name)
          .filter((x): x is string => !!x),
      ),
    ).join("; "),
  }));
}
