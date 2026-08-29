/**
 * Resources & Support Types
 *
 * Tracks how support/financial resources flow through the centre via ONE
 * core relationship:
 *
 *     SOURCE -> FUND -> EXPENSE -> BENEFIT -> CHILD
 *
 * - SOURCE  : where the support/financial resource comes from.
 * - FUND    : organises money from a Source for a purpose.
 * - EXPENSE : how money from a Fund was used.
 * - BENEFIT : what was provided as a result of an Expense.
 * - CHILD   : the EXISTING child record that benefited (never duplicated).
 *
 * BALANCES: never stored on the row; computed from actual records.
 *
 * SECURITY: centre_id + RLS enforce tenant isolation. resources.*
 *           permissions are deny-by-default.
 */

// ─── Enumerations ────────────────────────────────────────────

export const SUPPORT_SOURCE_TYPES = [
  "DONATION",
  "SPONSORSHIP",
  "GRANT",
  "OTHER",
] as const;
export type SupportSourceType = (typeof SUPPORT_SOURCE_TYPES)[number];

export const SUPPORT_EXPENSE_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
] as const;
export type SupportExpenseStatus = (typeof SUPPORT_EXPENSE_STATUSES)[number];

export const SUPPORT_BENEFIT_TYPES = [
  "FOOD",
  "CLOTHES",
  "BOOKS",
  "EDUCATION_SUPPORT",
  "MEDICAL_SUPPORT",
  "OTHER",
] as const;
export type SupportBenefitType = (typeof SUPPORT_BENEFIT_TYPES)[number];

export const SUPPORT_DOCUMENT_ENTITIES = [
  "SOURCE",
  "EXPENSE",
  "BENEFIT",
] as const;
export type SupportDocumentEntity = (typeof SUPPORT_DOCUMENT_ENTITIES)[number];

export const SUPPORT_DOCUMENTS_BUCKET = "support-documents";

// ─── Source ──────────────────────────────────────────────────

export interface SupportSource {
  id: string;
  centre_id: string;
  source_type: SupportSourceType;
  source_name: string;
  amount: number;
  source_date: string | null;
  purpose: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSupportSourceInput {
  centre_id: string;
  source_type: SupportSourceType;
  source_name: string;
  amount: number;
  source_date?: string | null;
  purpose?: string | null;
  notes?: string | null;
}

export interface UpdateSupportSourceInput {
  source_type?: SupportSourceType;
  source_name?: string | null;
  amount?: number;
  source_date?: string | null;
  purpose?: string | null;
  notes?: string | null;
}

// ─── Fund ────────────────────────────────────────────────────

export interface SupportFund {
  id: string;
  centre_id: string;
  source_id: string;
  fund_name: string;
  amount_allocated: number;
  purpose: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSupportFundInput {
  centre_id: string;
  source_id: string;
  fund_name: string;
  amount_allocated: number;
  purpose?: string | null;
}

export interface UpdateSupportFundInput {
  source_id?: string;
  fund_name?: string | null;
  amount_allocated?: number;
  purpose?: string | null;
}

// ─── Expense ─────────────────────────────────────────────────

export interface SupportExpense {
  id: string;
  centre_id: string;
  fund_id: string;
  description: string;
  amount: number;
  expense_date: string | null;
  approval_status: SupportExpenseStatus;
  approved_by: string | null;
  approved_at: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSupportExpenseInput {
  centre_id: string;
  fund_id: string;
  description: string;
  amount: number;
  expense_date?: string | null;
  approval_status?: SupportExpenseStatus;
  notes?: string | null;
}

export interface UpdateSupportExpenseInput {
  description?: string | null;
  amount?: number;
  expense_date?: string | null;
  notes?: string | null;
}

// ─── Benefit ─────────────────────────────────────────────────

export interface SupportBenefit {
  id: string;
  centre_id: string;
  expense_id: string;
  benefit_type: SupportBenefitType;
  description: string | null;
  benefit_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSupportBenefitInput {
  centre_id: string;
  expense_id: string;
  benefit_type: SupportBenefitType;
  description?: string | null;
  benefit_date?: string | null;
}

export interface UpdateSupportBenefitInput {
  benefit_type?: SupportBenefitType;
  description?: string | null;
  benefit_date?: string | null;
}

// ─── Benefit -> Child (join) ─────────────────────────────────

export interface SupportBenefitChild {
  id: string;
  centre_id: string;
  benefit_id: string;
  child_id: string;
  created_by: string;
  created_at: string;
}

// A child with its human-readable reference, for display in the UI.
export interface SupportChildRef {
  id: string;
  reference_number: string;
  first_name: string;
  last_name: string;
}

// ─── Documents ───────────────────────────────────────────────

export interface SupportDocument {
  id: string;
  centre_id: string;
  entity_type: SupportDocumentEntity;
  entity_id: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  storage_path: string;
  description: string | null;
  uploaded_by: string;
  uploaded_at: string;
  metadata: Record<string, unknown> | null;
}

export interface CreateSupportDocumentInput {
  centre_id: string;
  entity_type: SupportDocumentEntity;
  entity_id: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  storage_path: string;
  description?: string | null;
}

// ─── Computed detail views (balances derived, never stored) ──

export interface SupportSourceDetail extends SupportSource {
  /** Sum of allocations across this Source's Funds. */
  allocated: number;
  /** Sum of APPROVED expenses flowing from this Source's Funds. */
  used: number;
  /** amount - allocated (never typed manually). */
  remaining: number;
  funds: SupportFundDetail[];
}

export interface SupportFundDetail extends SupportFund {
  /** Convenience reference to the parent Source. */
  source: SupportSource | null;
  /** Sum of APPROVED expenses for this Fund. */
  used: number;
  /** amount_allocated - used. */
  balance: number;
  expenses: SupportExpenseDetail[];
}

export interface SupportExpenseDetail extends SupportExpense {
  fund: SupportFundDetail | null;
  benefits: SupportBenefitDetail[];
}

export interface SupportBenefitDetail extends SupportBenefit {
  expense: SupportExpenseDetail | null;
  children: SupportChildRef[];
}

// ─── Overview ────────────────────────────────────────────────

export interface SupportOverview {
  total_sources: number;
  total_funds: number;
  total_expenses: number;
  total_benefits: number;
  total_received: number;
  total_allocated: number;
  total_used: number;
  total_children_benefited: number;
  by_source_type: { source_type: SupportSourceType; count: number; amount: number }[];
  by_benefit_type: { benefit_type: SupportBenefitType; count: number }[];
  recent_funds: SupportFundDetail[];
  recent_expenses: SupportExpenseDetail[];
}

// ─── Display Helpers ─────────────────────────────────────────

export function getSourceTypeDisplay(t: SupportSourceType): string {
  const map: Record<SupportSourceType, string> = {
    DONATION: "Donation",
    SPONSORSHIP: "Sponsorship",
    GRANT: "Grant",
    OTHER: "Other",
  };
  return map[t];
}

export function getExpenseStatusDisplay(s: SupportExpenseStatus): string {
  const map: Record<SupportExpenseStatus, string> = {
    PENDING: "Pending",
    APPROVED: "Approved",
    REJECTED: "Rejected",
  };
  return map[s];
}

export function getBenefitTypeDisplay(t: SupportBenefitType): string {
  const map: Record<SupportBenefitType, string> = {
    FOOD: "Food",
    CLOTHES: "Clothes",
    BOOKS: "Books",
    EDUCATION_SUPPORT: "Education Support",
    MEDICAL_SUPPORT: "Medical Support",
    OTHER: "Other",
  };
  return map[t];
}

/** Format a number as Tanzanian Shillings, e.g. "TSh 5,000,000". */
export function formatTsh(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "TSh 0";
  const n = Math.abs(amount);
  const formatted = n.toLocaleString("en-US", {
    minimumFractionDigits: amount % 1 !== 0 ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return `TSh ${formatted}`;
}

/** Human-readable label for a child, e.g. "Juma — CH-0001". */
export function childLabel(child: { reference_number: string; first_name: string; last_name: string }): string {
  return `${child.first_name} ${child.last_name} — ${child.reference_number}`;
}
