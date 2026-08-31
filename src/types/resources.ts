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
  "CONTRIBUTION",
  "RESOURCE",
  "OTHER",
] as const;
export type SupportSourceType = (typeof SUPPORT_SOURCE_TYPES)[number];

export const SUPPORT_SOURCE_STATUSES = [
  "PENDING",
  "RECEIVED",
  "FAILED",
  "CANCELLED",
  "REFUNDED",
] as const;
export type SupportSourceStatus = (typeof SUPPORT_SOURCE_STATUSES)[number];

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
  "ASSET",
] as const;
export type SupportDocumentEntity = (typeof SUPPORT_DOCUMENT_ENTITIES)[number];

export const SUPPORT_DOCUMENTS_BUCKET = "support-documents";

// ─── Asset enumerations ──────────────────────────────────────

export const ASSET_CATEGORIES = [
  "FURNITURE",
  "EQUIPMENT",
  "VEHICLE",
  "ELECTRONICS",
  "APPLIANCE",
  "BEDDING",
  "OTHER",
] as const;
export type AssetCategory = (typeof ASSET_CATEGORIES)[number];

export const ASSET_STATUSES = [
  "ACTIVE",
  "IN_USE",
  "MAINTENANCE",
  "DAMAGED",
  "LOST",
  "DISPOSED",
] as const;
export type AssetStatus = (typeof ASSET_STATUSES)[number];

export const ASSET_CONDITIONS = [
  "GOOD",
  "FAIR",
  "NEEDS_REPAIR",
  "DAMAGED",
] as const;
export type AssetCondition = (typeof ASSET_CONDITIONS)[number];

export const ASSET_COST_TYPES = ["REPAIR", "MAINTENANCE"] as const;
export type AssetCostType = (typeof ASSET_COST_TYPES)[number];

export const ASSET_HISTORY_EVENTS = [
  "CREATED",
  "UPDATED",
  "COST_RECORDED",
  "STATUS_CHANGED",
  "LOCATION_CHANGED",
  "CONDITION_CHANGED",
  "DISPOSED",
] as const;
export type AssetHistoryEvent = (typeof ASSET_HISTORY_EVENTS)[number];

export const ASSET_LOCATIONS = [
  "DINING_ROOM",
  "KITCHEN",
  "OFFICE",
  "DORMITORY",
  "STORE",
  "CLASSROOM",
  "OUTSIDE",
  "OTHER",
] as const;
export type AssetLocation = (typeof ASSET_LOCATIONS)[number];

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
  status: SupportSourceStatus;
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

// ─── Asset ───────────────────────────────────────────────────

export interface SupportAsset {
  id: string;
  centre_id: string;
  asset_id: string | null;
  asset_name: string;
  asset_category: AssetCategory;
  quantity: number;
  date_acquired: string | null;
  location: string | null;
  asset_status: AssetStatus;
  asset_condition: AssetCondition;
  source_id: string | null;
  fund_id: string | null;
  expense_id: string | null;
  benefit_id: string | null;
  source_unknown: boolean;
  purchase_cost: number | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSupportAssetInput {
  centre_id: string;
  asset_id?: string | null;
  asset_name: string;
  asset_category: AssetCategory;
  quantity?: number;
  date_acquired?: string | null;
  location?: string | null;
  asset_status?: AssetStatus;
  asset_condition?: AssetCondition;
  source_id?: string | null;
  fund_id?: string | null;
  expense_id?: string | null;
  benefit_id?: string | null;
  source_unknown?: boolean;
  purchase_cost?: number | null;
  notes?: string | null;
}

export interface UpdateSupportAssetInput {
  asset_id?: string | null;
  asset_name?: string | null;
  asset_category?: AssetCategory;
  quantity?: number;
  date_acquired?: string | null;
  location?: string | null;
  asset_status?: AssetStatus;
  asset_condition?: AssetCondition;
  source_id?: string | null;
  fund_id?: string | null;
  expense_id?: string | null;
  benefit_id?: string | null;
  source_unknown?: boolean;
  purchase_cost?: number | null;
  notes?: string | null;
}

export interface SupportAssetCost {
  id: string;
  centre_id: string;
  asset_id: string;
  cost_type: AssetCostType;
  amount: number | null;
  cost_date: string | null;
  expense_id: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export interface CreateSupportAssetCostInput {
  centre_id: string;
  asset_id: string;
  cost_type: AssetCostType;
  amount?: number | null;
  cost_date?: string | null;
  expense_id?: string | null;
  notes?: string | null;
}

export interface SupportAssetHistory {
  id: string;
  centre_id: string;
  asset_id: string;
  event_type: AssetHistoryEvent;
  description: string | null;
  previous_value: string | null;
  new_value: string | null;
  changed_by: string;
  changed_at: string;
}

/** Asset with relationships + computed cost breakdown (never stored). */
export interface SupportAssetDetail extends SupportAsset {
  source: SupportSource | null;
  fund: SupportFund | null;
  expense: SupportExpenseDetail | null;
  benefit: SupportBenefitDetail | null;
  /** Sum of REPAIR cost rows (amount ?? 0). */
  repair_cost: number;
  /** Sum of MAINTENANCE cost rows (amount ?? 0). */
  maintenance_cost: number;
  /** purchase_cost + repair_cost + maintenance_cost (auto-computed). */
  total_cost: number;
  /** number of cost rows whose amount is unknown. */
  unknown_cost_count: number;
  costs: SupportAssetCost[];
  history: SupportAssetHistory[];
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
  total_assets: number;
  total_assets_value: number;
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
    CONTRIBUTION: "Contribution",
    RESOURCE: "Resource",
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

export function getAssetCategoryDisplay(c: AssetCategory): string {
  const map: Record<AssetCategory, string> = {
    FURNITURE: "Furniture",
    EQUIPMENT: "Equipment",
    VEHICLE: "Vehicle",
    ELECTRONICS: "Electronics",
    APPLIANCE: "Appliance",
    BEDDING: "Bedding",
    OTHER: "Other",
  };
  return map[c];
}

export function getAssetStatusDisplay(s: AssetStatus): string {
  const map: Record<AssetStatus, string> = {
    ACTIVE: "Active",
    IN_USE: "In Use",
    MAINTENANCE: "Maintenance",
    DAMAGED: "Damaged",
    LOST: "Lost",
    DISPOSED: "Disposed",
  };
  return map[s];
}

export function getAssetConditionDisplay(c: AssetCondition): string {
  const map: Record<AssetCondition, string> = {
    GOOD: "Good",
    FAIR: "Fair",
    NEEDS_REPAIR: "Needs Repair",
    DAMAGED: "Damaged",
  };
  return map[c];
}

export function getAssetCostTypeDisplay(c: AssetCostType): string {
  const map: Record<AssetCostType, string> = {
    REPAIR: "Repair",
    MAINTENANCE: "Maintenance",
  };
  return map[c];
}

/** Title-case a stored location value (e.g. "DINING_ROOM" -> "Dining Room"). */
export function getAssetLocationDisplay(location: string | null | undefined): string {
  if (!location) return "-";
  return location
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}
