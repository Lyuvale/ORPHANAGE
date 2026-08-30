import { z } from "zod";
import {
  SUPPORT_SOURCE_TYPES,
  SUPPORT_BENEFIT_TYPES,
  SUPPORT_EXPENSE_STATUSES,
  ASSET_CATEGORIES,
  ASSET_STATUSES,
  ASSET_CONDITIONS,
  ASSET_COST_TYPES,
} from "@/types/resources";

const optionalDateString = () =>
  z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date")
    .optional()
    .nullable();

const optionalText = (max: number, label: string) =>
  z
    .string()
    .max(max, `${label} must be ${max} characters or fewer`)
    .trim()
    .optional()
    .or(z.literal("").transform(() => null))
    .or(z.null());

const requiredText = (max: number, label: string) =>
  z.string().min(1, `${label} is required`).max(max, `${label} must be ${max} characters or fewer`).trim();

// Safe amount: a positive number, allowing string inputs from forms.
const amount = () =>
  z.union([z.number().finite(), z.string()]).transform((v, ctx) => {
    const n = typeof v === "string" ? parseFloat(v) : v;
    if (typeof n !== "number" || isNaN(n)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Amount must be a number" });
      return z.NEVER;
    }
    if (n < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Amount cannot be negative" });
      return z.NEVER;
    }
    return n;
  });

// ─── Sources ─────────────────────────────────────────────────

export const createSourceSchema = z.object({
  centre_id: z.string().uuid("Invalid centre ID"),
  source_type: z.enum(SUPPORT_SOURCE_TYPES, {
    errorMap: () => ({ message: "Invalid source type" }),
  }),
  source_name: requiredText(200, "Source name"),
  amount: amount(),
  source_date: optionalDateString(),
  purpose: optionalText(500, "Purpose"),
  notes: optionalText(2000, "Notes"),
});

export const updateSourceSchema = z
  .object({
    source_type: z.enum(SUPPORT_SOURCE_TYPES, {
      errorMap: () => ({ message: "Invalid source type" }),
    }).optional(),
    source_name: optionalText(200, "Source name"),
    amount: amount().optional(),
    source_date: optionalDateString(),
    purpose: optionalText(500, "Purpose"),
    notes: optionalText(2000, "Notes"),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

// ─── Funds ───────────────────────────────────────────────────

export const createFundSchema = z.object({
  centre_id: z.string().uuid("Invalid centre ID"),
  source_id: z.string().uuid("Invalid source ID"),
  fund_name: requiredText(200, "Fund name"),
  amount_allocated: amount(),
  purpose: optionalText(500, "Purpose"),
});

export const updateFundSchema = z
  .object({
    source_id: z.string().uuid("Invalid source ID").optional(),
    fund_name: optionalText(200, "Fund name"),
    amount_allocated: amount().optional(),
    purpose: optionalText(500, "Purpose"),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

// ─── Expenses ────────────────────────────────────────────────

export const createExpenseSchema = z.object({
  centre_id: z.string().uuid("Invalid centre ID"),
  fund_id: z.string().uuid("Invalid fund ID"),
  description: requiredText(500, "Description"),
  amount: amount(),
  expense_date: optionalDateString(),
  approval_status: z.enum(SUPPORT_EXPENSE_STATUSES, {
    errorMap: () => ({ message: "Invalid approval status" }),
  }).optional(),
  notes: optionalText(2000, "Notes"),
});

export const updateExpenseSchema = z
  .object({
    description: optionalText(500, "Description"),
    amount: amount().optional(),
    expense_date: optionalDateString(),
    notes: optionalText(2000, "Notes"),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const expenseApprovalSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "PENDING"], {
    errorMap: () => ({ message: "Invalid approval status" }),
  }),
});

// ─── Benefits ────────────────────────────────────────────────

export const createBenefitSchema = z.object({
  centre_id: z.string().uuid("Invalid centre ID"),
  expense_id: z.string().uuid("Invalid expense ID"),
  benefit_type: z.enum(SUPPORT_BENEFIT_TYPES, {
    errorMap: () => ({ message: "Invalid benefit type" }),
  }),
  description: optionalText(500, "Description"),
  benefit_date: optionalDateString(),
  child_ids: z.array(z.string().uuid("Invalid child ID")).optional().default([]),
});

export const updateBenefitSchema = z
  .object({
    benefit_type: z.enum(SUPPORT_BENEFIT_TYPES, {
      errorMap: () => ({ message: "Invalid benefit type" }),
    }).optional(),
    description: optionalText(500, "Description"),
    benefit_date: optionalDateString(),
    child_ids: z.array(z.string().uuid("Invalid child ID")).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const benefitChildrenSchema = z.object({
  child_ids: z.array(z.string().uuid("Invalid child ID")),
});

// ─── Assets ──────────────────────────────────────────────────

const optionalUuid = (label: string) =>
  z
    .string()
    .uuid(`Invalid ${label} ID`)
    .nullable()
    .optional();

const optionalAmount = (label: string) =>
  z
    .union([z.number().finite(), z.string()])
    .transform((v, ctx) => {
      const n = typeof v === "string" ? parseFloat(v) : v;
      if (typeof n !== "number" || isNaN(n)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} must be a number` });
        return z.NEVER;
      }
      if (n < 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} cannot be negative` });
        return z.NEVER;
      }
      return n;
    })
    .nullable()
    .optional();

export const createAssetSchema = z.object({
  centre_id: z.string().uuid("Invalid centre ID"),
  asset_id: optionalText(50, "Asset ID"),
  asset_name: requiredText(200, "Asset name"),
  asset_category: z.enum(ASSET_CATEGORIES, {
    errorMap: () => ({ message: "Invalid asset category" }),
  }),
  quantity: z.union([z.number().int().min(1), z.string()]).transform((v, ctx) => {
    const n = typeof v === "string" ? parseInt(v, 10) : v;
    if (typeof n !== "number" || isNaN(n) || n < 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Quantity must be at least 1" });
      return z.NEVER;
    }
    return n;
  }).optional(),
  date_acquired: optionalDateString(),
  location: optionalText(100, "Location"),
  asset_status: z.enum(ASSET_STATUSES, {
    errorMap: () => ({ message: "Invalid asset status" }),
  }).optional(),
  asset_condition: z.enum(ASSET_CONDITIONS, {
    errorMap: () => ({ message: "Invalid asset condition" }),
  }).optional(),
  source_id: optionalUuid("source"),
  fund_id: optionalUuid("fund"),
  expense_id: optionalUuid("expense"),
  benefit_id: optionalUuid("benefit"),
  source_unknown: z.boolean().optional(),
  purchase_cost: optionalAmount("Purchase cost"),
  notes: optionalText(2000, "Notes"),
});

export const updateAssetSchema = z
  .object({
    asset_id: optionalText(50, "Asset ID"),
    asset_name: optionalText(200, "Asset name"),
    asset_category: z.enum(ASSET_CATEGORIES, {
      errorMap: () => ({ message: "Invalid asset category" }),
    }).optional(),
    quantity: z.union([z.number().int().min(1), z.string()]).transform((v, ctx) => {
      const n = typeof v === "string" ? parseInt(v, 10) : v;
      if (typeof n !== "number" || isNaN(n) || n < 1) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Quantity must be at least 1" });
        return z.NEVER;
      }
      return n;
    }).optional(),
    date_acquired: optionalDateString(),
    location: optionalText(100, "Location"),
    asset_status: z.enum(ASSET_STATUSES, {
      errorMap: () => ({ message: "Invalid asset status" }),
    }).optional(),
    asset_condition: z.enum(ASSET_CONDITIONS, {
      errorMap: () => ({ message: "Invalid asset condition" }),
    }).optional(),
    source_id: optionalUuid("source"),
    fund_id: optionalUuid("fund"),
    expense_id: optionalUuid("expense"),
    benefit_id: optionalUuid("benefit"),
    source_unknown: z.boolean().optional(),
    purchase_cost: optionalAmount("Purchase cost"),
    notes: optionalText(2000, "Notes"),
    status_change_reason: optionalText(1000, "Reason"),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const createAssetCostSchema = z.object({
  centre_id: z.string().uuid("Invalid centre ID"),
  asset_id: z.string().uuid("Invalid asset ID"),
  cost_type: z.enum(ASSET_COST_TYPES, {
    errorMap: () => ({ message: "Invalid cost type" }),
  }),
  amount: optionalAmount("Cost"),
  cost_date: optionalDateString(),
  expense_id: optionalUuid("expense"),
  notes: optionalText(2000, "Notes"),
});

export const assetStatusSchema = z.object({
  asset_status: z.enum(ASSET_STATUSES, {
    errorMap: () => ({ message: "Invalid asset status" }),
  }),
  asset_condition: z.enum(ASSET_CONDITIONS, {
    errorMap: () => ({ message: "Invalid asset condition" }),
  }).optional(),
  location: optionalText(100, "Location"),
  reason: optionalText(1000, "Reason"),
});

// ─── Misc ────────────────────────────────────────────────────

export const searchSchema = z.object({
  type: z.string().optional(),
  status: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

/** Coerce form strings into the shape expected by create schemas. */
export function coerceCreate(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...body };
  if (typeof out.amount === "string" && out.amount === "") delete out.amount;
  if (typeof out.amount_allocated === "string" && out.amount_allocated === "") delete out.amount_allocated;
  if (typeof out.purchase_cost === "string" && out.purchase_cost === "") out.purchase_cost = null;
  if (typeof out.quantity === "string" && out.quantity === "") delete out.quantity;
  for (const k of ["source_date", "expense_date", "benefit_date", "cost_date", "date_acquired"]) {
    if (out[k] === "") out[k] = null;
  }
  for (const k of ["purpose", "notes", "description", "source_name", "fund_name", "location", "asset_id", "reason", "status_change_reason"]) {
    if (out[k] === "") out[k] = null;
  }
  if (Array.isArray(out.child_ids)) {
    out.child_ids = out.child_ids.filter(Boolean);
  }
  return out;
}
