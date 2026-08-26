import { z } from "zod";
import {
  SAFEGUARDING_STATUSES,
  SAFEGUARDING_SEVERITIES,
  SAFEGUARDING_CONCERN_TYPES,
  ESCALATION_STATUSES,
} from "@/types/safeguarding";

// ─── Create Safeguarding Concern Schema ──────────────────────

export const createSafeguardingConcernSchema = z.object({
  centre_id: z.string().uuid("Invalid centre ID"),
  child_id: z.string().uuid("Invalid child ID"),
  case_id: z
    .string()
    .uuid("Invalid case ID")
    .optional()
    .or(z.literal(""))
    .nullable(),
  concern_type: z.enum(SAFEGUARDING_CONCERN_TYPES, {
    errorMap: () => ({ message: "Invalid concern type" }),
  }),
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or fewer")
    .trim(),
  description: z
    .string()
    .min(1, "Description is required")
    .max(10000, "Description must be 10000 characters or fewer")
    .trim(),
  severity: z
    .enum(SAFEGUARDING_SEVERITIES, {
      errorMap: () => ({ message: "Invalid severity" }),
    })
    .optional()
    .default("medium"),
  location: z
    .string()
    .max(500, "Location must be 500 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
  witnesses: z
    .string()
    .max(2000, "Witnesses must be 2000 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
  evidence_summary: z
    .string()
    .max(10000, "Evidence summary must be 10000 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
  action_taken: z
    .string()
    .max(10000, "Action taken must be 10000 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
  external_referral: z.boolean().optional().default(false),
  external_agency: z
    .string()
    .max(200, "External agency must be 200 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
  external_reference: z
    .string()
    .max(200, "External reference must be 200 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
  assigned_to: z
    .string()
    .uuid("Invalid user ID")
    .optional()
    .or(z.literal(""))
    .nullable(),
});

// ─── Update Safeguarding Concern Schema ──────────────────────

export const updateSafeguardingConcernSchema = z
  .object({
    title: z
      .string()
      .min(1, "Title cannot be empty")
      .max(200, "Title must be 200 characters or fewer")
      .trim()
      .optional(),
    description: z
      .string()
      .max(10000, "Description must be 10000 characters or fewer")
      .trim()
      .optional(),
    severity: z.enum(SAFEGUARDING_SEVERITIES, {
      errorMap: () => ({ message: "Invalid severity" }),
    }).optional(),
    assigned_to: z
      .string()
      .uuid("Invalid user ID")
      .optional()
      .or(z.literal("").transform(() => null))
      .or(z.null()),
    location: z
      .string()
      .max(500, "Location must be 500 characters or fewer")
      .trim()
      .optional()
      .or(z.literal("").transform(() => null))
      .or(z.null()),
    witnesses: z
      .string()
      .max(2000, "Witnesses must be 2000 characters or fewer")
      .trim()
      .optional()
      .or(z.literal("").transform(() => null))
      .or(z.null()),
    evidence_summary: z
      .string()
      .max(10000, "Evidence summary must be 10000 characters or fewer")
      .trim()
      .optional()
      .or(z.literal("").transform(() => null))
      .or(z.null()),
    action_taken: z
      .string()
      .max(10000, "Action taken must be 10000 characters or fewer")
      .trim()
      .optional()
      .or(z.literal("").transform(() => null))
      .or(z.null()),
    external_referral: z.boolean().optional(),
    external_agency: z
      .string()
      .max(200, "External agency must be 200 characters or fewer")
      .trim()
      .optional()
      .or(z.literal("").transform(() => null))
      .or(z.null()),
    external_reference: z
      .string()
      .max(200, "External reference must be 200 characters or fewer")
      .trim()
      .optional()
      .or(z.literal("").transform(() => null))
      .or(z.null()),
    resolution_notes: z
      .string()
      .max(5000, "Resolution notes must be 5000 characters or fewer")
      .trim()
      .optional()
      .or(z.literal("").transform(() => null))
      .or(z.null()),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

// ─── Update Safeguarding Status Schema ───────────────────────

export const updateSafeguardingStatusSchema = z.object({
  new_status: z.enum(SAFEGUARDING_STATUSES, {
    errorMap: () => ({ message: "Invalid safeguarding status" }),
  }),
  reason: z
    .string()
    .max(500, "Reason must be 500 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
});

// ─── Create Safeguarding Action Schema ───────────────────────

export const createSafeguardingActionSchema = z.object({
  concern_id: z.string().uuid("Invalid concern ID"),
  centre_id: z.string().uuid("Invalid centre ID"),
  action_type: z
    .string()
    .min(1, "Action type is required")
    .max(100, "Action type must be 100 characters or fewer")
    .trim(),
  description: z
    .string()
    .min(1, "Description is required")
    .max(5000, "Description must be 5000 characters or fewer")
    .trim(),
  assigned_to: z
    .string()
    .uuid("Invalid user ID")
    .optional()
    .or(z.literal(""))
    .nullable(),
  due_date: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date")
    .optional()
    .nullable(),
});

// ─── Update Safeguarding Action Schema ───────────────────────

export const updateSafeguardingActionSchema = z
  .object({
    action_type: z
      .string()
      .min(1, "Type cannot be empty")
      .max(100, "Action type must be 100 characters or fewer")
      .trim()
      .optional(),
    description: z
      .string()
      .max(5000, "Description must be 5000 characters or fewer")
      .trim()
      .optional(),
    status: z
      .string()
      .max(50, "Status must be 50 characters or fewer")
      .trim()
      .optional(),
    assigned_to: z
      .string()
      .uuid("Invalid user ID")
      .optional()
      .or(z.literal("").transform(() => null))
      .or(z.null()),
    due_date: z
      .string()
      .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date")
      .optional()
      .nullable(),
    completed_date: z
      .string()
      .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date")
      .optional()
      .nullable(),
    outcome: z
      .string()
      .max(5000, "Outcome must be 5000 characters or fewer")
      .trim()
      .optional()
      .or(z.literal("").transform(() => null))
      .or(z.null()),
    notes: z
      .string()
      .max(5000, "Notes must be 5000 characters or fewer")
      .trim()
      .optional()
      .or(z.literal("").transform(() => null))
      .or(z.null()),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

// ─── Create Escalation Schema ────────────────────────────────

export const createEscalationSchema = z.object({
  concern_id: z.string().uuid("Invalid concern ID"),
  centre_id: z.string().uuid("Invalid centre ID"),
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or fewer")
    .trim(),
  description: z
    .string()
    .min(1, "Description is required")
    .max(5000, "Description must be 5000 characters or fewer")
    .trim(),
  reason: z
    .string()
    .min(1, "Reason is required")
    .max(2000, "Reason must be 2000 characters or fewer")
    .trim(),
  escalated_to: z
    .string()
    .uuid("Invalid user ID")
    .optional()
    .or(z.literal(""))
    .nullable(),
});

// ─── Update Escalation Status Schema ─────────────────────────

export const updateEscalationStatusSchema = z.object({
  new_status: z.enum(ESCALATION_STATUSES, {
    errorMap: () => ({ message: "Invalid escalation status" }),
  }),
  resolution_notes: z
    .string()
    .max(5000, "Resolution notes must be 5000 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
});

// ─── Safeguarding Search Schema ──────────────────────────────

export const safeguardingSearchSchema = z.object({
  child_id: z.string().uuid().optional().or(z.literal("")),
  case_id: z.string().uuid().optional().or(z.literal("")),
  status: z.enum(SAFEGUARDING_STATUSES).optional(),
  severity: z.enum(SAFEGUARDING_SEVERITIES).optional(),
  concern_type: z.enum(SAFEGUARDING_CONCERN_TYPES).optional(),
  assigned_to: z.string().uuid().optional().or(z.literal("")),
  search: z
    .string()
    .max(200, "Search term must be 200 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
  limit: z
    .string()
    .optional()
    .transform((val) => {
      const num = parseInt(val ?? "50", 10);
      return isNaN(num) ? 50 : Math.min(Math.max(num, 1), 100);
    }),
  offset: z
    .string()
    .optional()
    .transform((val) => {
      const num = parseInt(val ?? "0", 10);
      return isNaN(num) ? 0 : Math.max(num, 0);
    }),
});

// ─── Inferred Types ──────────────────────────────────────────

export type CreateSafeguardingConcernSchema = z.infer<typeof createSafeguardingConcernSchema>;
export type UpdateSafeguardingConcernSchema = z.infer<typeof updateSafeguardingConcernSchema>;
export type UpdateSafeguardingStatusSchema = z.infer<typeof updateSafeguardingStatusSchema>;
export type CreateSafeguardingActionSchema = z.infer<typeof createSafeguardingActionSchema>;
export type UpdateSafeguardingActionSchema = z.infer<typeof updateSafeguardingActionSchema>;
export type CreateEscalationSchema = z.infer<typeof createEscalationSchema>;
export type UpdateEscalationStatusSchema = z.infer<typeof updateEscalationStatusSchema>;
export type SafeguardingSearchSchema = z.infer<typeof safeguardingSearchSchema>;

// ─── Input Cleaning ──────────────────────────────────────────

export function cleanSafeguardingInput<T extends Record<string, unknown>>(
  input: T,
): T {
  const cleaned = { ...input };
  for (const [key, value] of Object.entries(cleaned)) {
    if (value === "") {
      cleaned[key as keyof T] = null as T[keyof T];
    }
  }
  return cleaned;
}
