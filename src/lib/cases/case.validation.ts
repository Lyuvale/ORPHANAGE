import { z } from "zod";
import {
  CASE_STATUSES,
  CASE_TYPES,
  CASE_PRIORITIES,
  CASE_CLASSIFICATIONS,
  ASSESSMENT_TYPES,
  CASE_PLAN_STATUSES,
  CASE_PLAN_ITEM_STATUSES,
  CASE_NOTE_TYPES,
} from "@/types/case";

// ─── Create Case Schema ──────────────────────────────────────

export const createCaseSchema = z.object({
  centre_id: z.string().uuid("Invalid centre ID"),
  child_id: z.string().uuid("Invalid child ID"),
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or fewer")
    .trim(),
  description: z
    .string()
    .max(5000, "Description must be 5000 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
  case_type: z.enum(CASE_TYPES, {
    errorMap: () => ({ message: "Invalid case type" }),
  }),
  priority: z
    .enum(CASE_PRIORITIES, {
      errorMap: () => ({ message: "Invalid priority" }),
    })
    .optional()
    .default("medium"),
  classification: z
    .enum(CASE_CLASSIFICATIONS, {
      errorMap: () => ({ message: "Invalid classification" }),
    })
    .optional()
    .default("standard"),
  assigned_to: z
    .string()
    .uuid("Invalid user ID")
    .optional()
    .or(z.literal(""))
    .nullable(),
});

// ─── Update Case Schema ──────────────────────────────────────

export const updateCaseSchema = z
  .object({
    title: z
      .string()
      .min(1, "Title cannot be empty")
      .max(200, "Title must be 200 characters or fewer")
      .trim()
      .optional(),
    description: z
      .string()
      .max(5000, "Description must be 5000 characters or fewer")
      .trim()
      .optional()
      .or(z.literal("").transform(() => null))
      .or(z.null()),
    case_type: z.enum(CASE_TYPES, {
      errorMap: () => ({ message: "Invalid case type" }),
    }).optional(),
    priority: z.enum(CASE_PRIORITIES, {
      errorMap: () => ({ message: "Invalid priority" }),
    }).optional(),
    classification: z.enum(CASE_CLASSIFICATIONS, {
      errorMap: () => ({ message: "Invalid classification" }),
    }).optional(),
    assigned_to: z
      .string()
      .uuid("Invalid user ID")
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

// ─── Update Case Status Schema ───────────────────────────────

export const updateCaseStatusSchema = z.object({
  new_status: z.enum(CASE_STATUSES, {
    errorMap: () => ({ message: "Invalid case status" }),
  }),
  reason: z
    .string()
    .max(500, "Reason must be 500 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
});

// ─── Create Assessment Schema ────────────────────────────────

export const createAssessmentSchema = z.object({
  case_id: z.string().uuid("Invalid case ID"),
  centre_id: z.string().uuid("Invalid centre ID"),
  assessment_type: z.enum(ASSESSMENT_TYPES, {
    errorMap: () => ({ message: "Invalid assessment type" }),
  }),
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or fewer")
    .trim(),
  summary: z
    .string()
    .max(10000, "Summary must be 10000 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
  findings: z
    .string()
    .max(10000, "Findings must be 10000 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
  recommendations: z
    .string()
    .max(10000, "Recommendations must be 10000 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
  next_review_date: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date")
    .optional()
    .nullable(),
});

// ─── Update Assessment Schema ────────────────────────────────

export const updateAssessmentSchema = z
  .object({
    title: z
      .string()
      .min(1, "Title cannot be empty")
      .max(200, "Title must be 200 characters or fewer")
      .trim()
      .optional(),
    summary: z
      .string()
      .max(10000, "Summary must be 10000 characters or fewer")
      .trim()
      .optional()
      .or(z.literal("").transform(() => null))
      .or(z.null()),
    findings: z
      .string()
      .max(10000, "Findings must be 10000 characters or fewer")
      .trim()
      .optional()
      .or(z.literal("").transform(() => null))
      .or(z.null()),
    recommendations: z
      .string()
      .max(10000, "Recommendations must be 10000 characters or fewer")
      .trim()
      .optional()
      .or(z.literal("").transform(() => null))
      .or(z.null()),
    next_review_date: z
      .string()
      .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date")
      .optional()
      .nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

// ─── Create Case Plan Schema ─────────────────────────────────

export const createCasePlanSchema = z.object({
  case_id: z.string().uuid("Invalid case ID"),
  centre_id: z.string().uuid("Invalid centre ID"),
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or fewer")
    .trim(),
  description: z
    .string()
    .max(5000, "Description must be 5000 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
  start_date: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date")
    .optional(),
  end_date: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date")
    .optional()
    .nullable(),
  review_frequency: z
    .string()
    .max(100, "Review frequency must be 100 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
  next_review_date: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date")
    .optional()
    .nullable(),
});

// ─── Update Case Plan Schema ─────────────────────────────────

export const updateCasePlanSchema = z
  .object({
    title: z
      .string()
      .min(1, "Title cannot be empty")
      .max(200, "Title must be 200 characters or fewer")
      .trim()
      .optional(),
    description: z
      .string()
      .max(5000, "Description must be 5000 characters or fewer")
      .trim()
      .optional()
      .or(z.literal("").transform(() => null))
      .or(z.null()),
    end_date: z
      .string()
      .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date")
      .optional()
      .nullable(),
    review_frequency: z
      .string()
      .max(100, "Review frequency must be 100 characters or fewer")
      .trim()
      .optional()
      .or(z.literal("").transform(() => null))
      .or(z.null()),
    next_review_date: z
      .string()
      .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date")
      .optional()
      .nullable(),
    metadata: z.record(z.unknown()).optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

// ─── Update Case Plan Status Schema ──────────────────────────

export const updateCasePlanStatusSchema = z.object({
  new_status: z.enum(CASE_PLAN_STATUSES, {
    errorMap: () => ({ message: "Invalid case plan status" }),
  }),
  reason: z
    .string()
    .max(500, "Reason must be 500 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
});

// ─── Create Case Plan Item Schema ────────────────────────────

export const createCasePlanItemSchema = z.object({
  case_plan_id: z.string().uuid("Invalid case plan ID"),
  centre_id: z.string().uuid("Invalid centre ID"),
  objective: z
    .string()
    .min(1, "Objective is required")
    .max(500, "Objective must be 500 characters or fewer")
    .trim(),
  description: z
    .string()
    .max(5000, "Description must be 5000 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
  responsible_person: z
    .string()
    .uuid("Invalid user ID")
    .optional()
    .or(z.literal(""))
    .nullable(),
  target_date: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date")
    .optional()
    .nullable(),
  sort_order: z
    .string()
    .optional()
    .transform((val) => {
      const num = parseInt(val ?? "0", 10);
      return isNaN(num) ? 0 : Math.max(num, 0);
    }),
});

// ─── Update Case Plan Item Schema ────────────────────────────

export const updateCasePlanItemSchema = z
  .object({
    objective: z
      .string()
      .min(1, "Objective cannot be empty")
      .max(500, "Objective must be 500 characters or fewer")
      .trim()
      .optional(),
    description: z
      .string()
      .max(5000, "Description must be 5000 characters or fewer")
      .trim()
      .optional()
      .or(z.literal("").transform(() => null))
      .or(z.null()),
    status: z.enum(CASE_PLAN_ITEM_STATUSES, {
      errorMap: () => ({ message: "Invalid plan item status" }),
    }).optional(),
    responsible_person: z
      .string()
      .uuid("Invalid user ID")
      .optional()
      .or(z.literal("").transform(() => null))
      .or(z.null()),
    target_date: z
      .string()
      .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date")
      .optional()
      .nullable(),
    completed_date: z
      .string()
      .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date")
      .optional()
      .nullable(),
    completion_notes: z
      .string()
      .max(5000, "Completion notes must be 5000 characters or fewer")
      .trim()
      .optional()
      .or(z.literal("").transform(() => null))
      .or(z.null()),
    sort_order: z
      .string()
      .optional()
      .transform((val) => {
        const num = parseInt(val ?? "0", 10);
        return isNaN(num) ? 0 : Math.max(num, 0);
      }),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

// ─── Create Case Note Schema ─────────────────────────────────

export const createCaseNoteSchema = z.object({
  case_id: z.string().uuid("Invalid case ID"),
  centre_id: z.string().uuid("Invalid centre ID"),
  note_type: z
    .enum(CASE_NOTE_TYPES, {
      errorMap: () => ({ message: "Invalid note type" }),
    })
    .optional()
    .default("general"),
  content: z
    .string()
    .min(1, "Content is required")
    .max(20000, "Content must be 20000 characters or fewer")
    .trim(),
  author_name: z
    .string()
    .max(200, "Author name must be 200 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
  is_pinned: z.boolean().optional().default(false),
  parent_note_id: z
    .string()
    .uuid("Invalid parent note ID")
    .optional()
    .or(z.literal(""))
    .nullable(),
});

// ─── Create Intervention Schema ──────────────────────────────

export const createInterventionSchema = z.object({
  case_id: z.string().uuid("Invalid case ID"),
  centre_id: z.string().uuid("Invalid centre ID"),
  case_plan_item_id: z
    .string()
    .uuid("Invalid plan item ID")
    .optional()
    .or(z.literal(""))
    .nullable(),
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or fewer")
    .trim(),
  description: z
    .string()
    .max(5000, "Description must be 5000 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
  intervention_type: z
    .string()
    .min(1, "Intervention type is required")
    .max(100, "Intervention type must be 100 characters or fewer")
    .trim(),
  scheduled_date: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date")
    .optional()
    .nullable(),
  conducted_by: z
    .string()
    .uuid("Invalid user ID")
    .optional()
    .or(z.literal(""))
    .nullable(),
});

// ─── Update Intervention Schema ──────────────────────────────

export const updateInterventionSchema = z
  .object({
    title: z
      .string()
      .min(1, "Title cannot be empty")
      .max(200, "Title must be 200 characters or fewer")
      .trim()
      .optional(),
    description: z
      .string()
      .max(5000, "Description must be 5000 characters or fewer")
      .trim()
      .optional()
      .or(z.literal("").transform(() => null))
      .or(z.null()),
    intervention_type: z
      .string()
      .min(1, "Type cannot be empty")
      .max(100, "Intervention type must be 100 characters or fewer")
      .trim()
      .optional(),
    status: z
      .string()
      .max(50, "Status must be 50 characters or fewer")
      .trim()
      .optional(),
    scheduled_date: z
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
    conducted_by: z
      .string()
      .uuid("Invalid user ID")
      .optional()
      .or(z.literal("").transform(() => null))
      .or(z.null()),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

// ─── Case Search Schema ──────────────────────────────────────

export const caseSearchSchema = z.object({
  status: z.enum(CASE_STATUSES).optional(),
  case_type: z.enum(CASE_TYPES).optional(),
  priority: z.enum(CASE_PRIORITIES).optional(),
  classification: z.enum(CASE_CLASSIFICATIONS).optional(),
  child_id: z.string().uuid().optional().or(z.literal("")),
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

export type CreateCaseSchema = z.infer<typeof createCaseSchema>;
export type UpdateCaseSchema = z.infer<typeof updateCaseSchema>;
export type UpdateCaseStatusSchema = z.infer<typeof updateCaseStatusSchema>;
export type CreateAssessmentSchema = z.infer<typeof createAssessmentSchema>;
export type UpdateAssessmentSchema = z.infer<typeof updateAssessmentSchema>;
export type CreateCasePlanSchema = z.infer<typeof createCasePlanSchema>;
export type UpdateCasePlanSchema = z.infer<typeof updateCasePlanSchema>;
export type UpdateCasePlanStatusSchema = z.infer<typeof updateCasePlanStatusSchema>;
export type CreateCasePlanItemSchema = z.infer<typeof createCasePlanItemSchema>;
export type UpdateCasePlanItemSchema = z.infer<typeof updateCasePlanItemSchema>;
export type CreateCaseNoteSchema = z.infer<typeof createCaseNoteSchema>;
export type CreateInterventionSchema = z.infer<typeof createInterventionSchema>;
export type UpdateInterventionSchema = z.infer<typeof updateInterventionSchema>;
export type CaseSearchSchema = z.infer<typeof caseSearchSchema>;

// ─── Input Cleaning ──────────────────────────────────────────

export function cleanCaseInput<T extends Record<string, unknown>>(
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
