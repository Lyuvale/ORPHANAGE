import { z } from "zod";
import {
  VISIT_TYPES,
  VISIT_STATUSES,
  VISIT_OUTCOMES,
  RESTRICTION_TYPES,
  CONTACT_ATTEMPT_TYPES,
  CONTACT_ATTEMPT_RESULTS,
} from "@/types/visit";

// ─── Create Visit Schema ────────────────────────────────────

export const createVisitSchema = z.object({
  centre_id: z.string().uuid("Invalid centre ID"),
  child_id: z.string().uuid("Invalid child ID"),
  guardian_id: z.string().uuid("Invalid guardian ID"),
  visit_type: z
    .enum(VISIT_TYPES, {
      errorMap: () => ({ message: "Invalid visit type" }),
    })
    .optional()
    .default("in_person"),
  scheduled_date: z
    .string()
    .min(1, "Scheduled date is required")
    .refine((val) => !isNaN(Date.parse(val)), "Invalid date"),
  scheduled_start_time: z
    .string()
    .optional()
    .nullable(),
  scheduled_end_time: z
    .string()
    .optional()
    .nullable(),
  location: z
    .string()
    .max(200, "Location must be 200 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
  purpose: z
    .string()
    .min(1, "Purpose is required")
    .max(1000, "Purpose must be 1000 characters or fewer")
    .trim(),
  notes: z
    .string()
    .max(5000, "Notes must be 5000 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
});

// ─── Update Visit Schema ────────────────────────────────────

export const updateVisitSchema = z
  .object({
    visit_type: z.enum(VISIT_TYPES, {
      errorMap: () => ({ message: "Invalid visit type" }),
    }).optional(),
    scheduled_date: z
      .string()
      .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date")
      .optional(),
    scheduled_start_time: z
      .string()
      .optional()
      .or(z.literal("").transform(() => null))
      .or(z.null()),
    scheduled_end_time: z
      .string()
      .optional()
      .or(z.literal("").transform(() => null))
      .or(z.null()),
    location: z
      .string()
      .max(200, "Location must be 200 characters or fewer")
      .trim()
      .optional()
      .or(z.literal("").transform(() => null))
      .or(z.null()),
    purpose: z
      .string()
      .min(1, "Purpose cannot be empty")
      .max(1000, "Purpose must be 1000 characters or fewer")
      .trim()
      .optional(),
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

// ─── Update Visit Status Schema ─────────────────────────────

export const updateVisitStatusSchema = z.object({
  new_status: z.enum(VISIT_STATUSES, {
    errorMap: () => ({ message: "Invalid visit status" }),
  }),
  reason: z
    .string()
    .max(500, "Reason must be 500 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
});

// ─── Check-In Schema ────────────────────────────────────────

export const checkInSchema = z.object({
  verification_method: z
    .string()
    .max(100, "Verification method must be 100 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
  notes: z
    .string()
    .max(5000, "Notes must be 5000 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
});

// ─── Check-Out Schema ───────────────────────────────────────

export const checkOutSchema = z.object({
  notes: z
    .string()
    .max(5000, "Notes must be 5000 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
});

// ─── Visit Outcome Schema ───────────────────────────────────

export const visitOutcomeSchema = z.object({
  outcome: z.enum(VISIT_OUTCOMES, {
    errorMap: () => ({ message: "Invalid visit outcome" }),
  }),
  outcome_notes: z
    .string()
    .max(5000, "Outcome notes must be 5000 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
  child_response: z
    .string()
    .max(5000, "Child response must be 5000 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
  family_response: z
    .string()
    .max(5000, "Family response must be 5000 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
  follow_up_required: z.boolean().optional().default(false),
  follow_up_date: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date")
    .optional()
    .nullable(),
  follow_up_staff_id: z
    .string()
    .uuid("Invalid user ID")
    .optional()
    .or(z.literal(""))
    .nullable(),
});

// ─── Create Restriction Schema ──────────────────────────────

export const createRestrictionSchema = z.object({
  centre_id: z.string().uuid("Invalid centre ID"),
  child_id: z.string().uuid("Invalid child ID"),
  guardian_id: z.string().uuid("Invalid guardian ID"),
  restriction_type: z.enum(RESTRICTION_TYPES, {
    errorMap: () => ({ message: "Invalid restriction type" }),
  }),
  reason: z
    .string()
    .min(1, "Reason is required")
    .max(2000, "Reason must be 2000 characters or fewer")
    .trim(),
  source_authority: z
    .string()
    .max(200, "Source authority must be 200 characters or fewer")
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
});

// ─── Update Restriction Schema ──────────────────────────────

export const updateRestrictionSchema = z
  .object({
    restriction_type: z.enum(RESTRICTION_TYPES, {
      errorMap: () => ({ message: "Invalid restriction type" }),
    }).optional(),
    reason: z
      .string()
      .min(1, "Reason cannot be empty")
      .max(2000, "Reason must be 2000 characters or fewer")
      .trim()
      .optional(),
    source_authority: z
      .string()
      .max(200, "Source authority must be 200 characters or fewer")
      .trim()
      .optional()
      .or(z.literal("").transform(() => null))
      .or(z.null()),
    end_date: z
      .string()
      .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date")
      .optional()
      .nullable(),
    is_active: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

// ─── Create Contact Attempt Schema ──────────────────────────

export const createContactAttemptSchema = z.object({
  centre_id: z.string().uuid("Invalid centre ID"),
  child_id: z.string().uuid("Invalid child ID"),
  guardian_id: z.string().uuid("Invalid guardian ID"),
  contact_type: z.enum(CONTACT_ATTEMPT_TYPES, {
    errorMap: () => ({ message: "Invalid contact attempt type" }),
  }),
  result: z.enum(CONTACT_ATTEMPT_RESULTS, {
    errorMap: () => ({ message: "Invalid contact attempt result" }),
  }),
  attempted_at: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date")
    .optional(),
  reason_unsuccessful: z
    .string()
    .max(500, "Reason must be 500 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
  notes: z
    .string()
    .max(5000, "Notes must be 5000 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
  staff_member_id: z.string().uuid("Invalid staff member ID"),
});

// ─── Visit Search Schema ────────────────────────────────────

export const visitSearchSchema = z.object({
  status: z.enum(VISIT_STATUSES).optional(),
  visit_type: z.enum(VISIT_TYPES).optional(),
  child_id: z.string().uuid().optional().or(z.literal("")),
  guardian_id: z.string().uuid().optional().or(z.literal("")),
  date_from: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date")
    .optional()
    .or(z.literal("")),
  date_to: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date")
    .optional()
    .or(z.literal("")),
  upcoming: z
    .string()
    .optional()
    .transform((val) => val === "true"),
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

// ─── Restriction Search Schema ──────────────────────────────

export const restrictionSearchSchema = z.object({
  child_id: z.string().uuid().optional().or(z.literal("")),
  guardian_id: z.string().uuid().optional().or(z.literal("")),
  is_active: z
    .string()
    .optional()
    .transform((val) => {
      if (val === "true") return true;
      if (val === "false") return false;
      return undefined;
    }),
  restriction_type: z.enum(RESTRICTION_TYPES).optional(),
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

// ─── Contact Attempt Search Schema ──────────────────────────

export const contactAttemptSearchSchema = z.object({
  child_id: z.string().uuid().optional().or(z.literal("")),
  guardian_id: z.string().uuid().optional().or(z.literal("")),
  contact_type: z.enum(CONTACT_ATTEMPT_TYPES).optional(),
  date_from: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date")
    .optional()
    .or(z.literal("")),
  date_to: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date")
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

// ─── Inferred Types ─────────────────────────────────────────

export type CreateVisitSchema = z.infer<typeof createVisitSchema>;
export type UpdateVisitSchema = z.infer<typeof updateVisitSchema>;
export type UpdateVisitStatusSchema = z.infer<typeof updateVisitStatusSchema>;
export type CheckInSchema = z.infer<typeof checkInSchema>;
export type CheckOutSchema = z.infer<typeof checkOutSchema>;
export type VisitOutcomeSchema = z.infer<typeof visitOutcomeSchema>;
export type CreateRestrictionSchema = z.infer<typeof createRestrictionSchema>;
export type UpdateRestrictionSchema = z.infer<typeof updateRestrictionSchema>;
export type CreateContactAttemptSchema = z.infer<typeof createContactAttemptSchema>;
export type VisitSearchSchema = z.infer<typeof visitSearchSchema>;
export type RestrictionSearchSchema = z.infer<typeof restrictionSearchSchema>;
export type ContactAttemptSearchSchema = z.infer<typeof contactAttemptSearchSchema>;

// ─── Input Cleaning ─────────────────────────────────────────

export function cleanVisitInput<T extends Record<string, unknown>>(
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
