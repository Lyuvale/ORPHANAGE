import { z } from "zod";
import {
  SUPPORT_SOURCE_TYPES,
  SUPPORT_BENEFIT_TYPES,
  SUPPORT_EXPENSE_STATUSES,
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
  for (const k of ["source_date", "expense_date", "benefit_date"]) {
    if (out[k] === "") out[k] = null;
  }
  for (const k of ["purpose", "notes", "description", "source_name", "fund_name"]) {
    if (out[k] === "") out[k] = null;
  }
  if (Array.isArray(out.child_ids)) {
    out.child_ids = out.child_ids.filter(Boolean);
  }
  return out;
}
