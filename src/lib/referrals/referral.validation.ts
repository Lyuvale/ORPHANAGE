import { z } from "zod";
import {
  REFERRAL_STATUSES,
  REFERRAL_SOURCES,
  REFERRAL_PRIORITIES,
} from "@/types/referral";

// ─── Create Referral Schema ──────────────────────────────────────────────────

export const createReferralSchema = z.object({
  centre_id: z.string().uuid("Invalid centre ID"),
  child_first_name: z
    .string()
    .min(1, "Child first name is required")
    .max(100, "Child first name must be 100 characters or fewer")
    .trim(),
  child_middle_name: z
    .string()
    .max(100, "Child middle name must be 100 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
  child_last_name: z
    .string()
    .min(1, "Child last name is required")
    .max(100, "Child last name must be 100 characters or fewer")
    .trim(),
  child_date_of_birth: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date of birth")
    .refine(
      (val) => !val || new Date(val) < new Date(),
      "Date of birth must be in the past",
    )
    .optional()
    .nullable(),
  child_gender: z
    .string()
    .refine(
      (val) => !val || ["male", "female", "other", "undisclosed"].includes(val),
      "Invalid gender",
    )
    .optional()
    .nullable(),
  child_nationality: z
    .string()
    .max(100, "Nationality must be 100 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
  source: z.enum(REFERRAL_SOURCES, {
    errorMap: () => ({ message: "Invalid referral source" }),
  }),
  priority: z
    .enum(REFERRAL_PRIORITIES, {
      errorMap: () => ({ message: "Invalid priority" }),
    })
    .optional(),
  referrer_name: z
    .string()
    .max(200, "Referrer name must be 200 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
  referrer_org: z
    .string()
    .max(200, "Referrer organization must be 200 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
  referrer_contact: z
    .string()
    .max(200, "Referrer contact must be 200 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
  reason: z
    .string()
    .min(1, "Reason for referral is required")
    .max(2000, "Reason must be 2000 characters or fewer")
    .trim(),
  notes: z
    .string()
    .max(5000, "Notes must be 5000 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
  metadata: z
    .record(z.unknown())
    .optional()
    .nullable(),
});

// ─── Update Referral Schema ──────────────────────────────────────────────────

export const updateReferralSchema = z
  .object({
    child_first_name: z
      .string()
      .min(1, "Child first name cannot be empty")
      .max(100, "Child first name must be 100 characters or fewer")
      .trim()
      .optional(),
    child_middle_name: z
      .string()
      .max(100, "Child middle name must be 100 characters or fewer")
      .trim()
      .optional()
      .or(z.literal("").transform(() => null))
      .or(z.null()),
    child_last_name: z
      .string()
      .min(1, "Child last name cannot be empty")
      .max(100, "Child last name must be 100 characters or fewer")
      .trim()
      .optional(),
    child_date_of_birth: z
      .string()
      .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date of birth")
      .refine(
        (val) => !val || new Date(val) < new Date(),
        "Date of birth must be in the past",
      )
      .optional()
      .nullable(),
    child_gender: z
      .string()
      .refine(
        (val) => !val || ["male", "female", "other", "undisclosed"].includes(val),
        "Invalid gender",
      )
      .optional()
      .nullable(),
    child_nationality: z
      .string()
      .max(100, "Nationality must be 100 characters or fewer")
      .trim()
      .optional()
      .or(z.literal("").transform(() => null))
      .or(z.null()),
    source: z
      .enum(REFERRAL_SOURCES, {
        errorMap: () => ({ message: "Invalid referral source" }),
      })
      .optional(),
    priority: z
      .enum(REFERRAL_PRIORITIES, {
        errorMap: () => ({ message: "Invalid priority" }),
      })
      .optional(),
    referrer_name: z
      .string()
      .max(200, "Referrer name must be 200 characters or fewer")
      .trim()
      .optional()
      .or(z.literal("").transform(() => null))
      .or(z.null()),
    referrer_org: z
      .string()
      .max(200, "Referrer organization must be 200 characters or fewer")
      .trim()
      .optional()
      .or(z.literal("").transform(() => null))
      .or(z.null()),
    referrer_contact: z
      .string()
      .max(200, "Referrer contact must be 200 characters or fewer")
      .trim()
      .optional()
      .or(z.literal("").transform(() => null))
      .or(z.null()),
    reason: z
      .string()
      .min(1, "Reason cannot be empty")
      .max(2000, "Reason must be 2000 characters or fewer")
      .trim()
      .optional(),
    notes: z
      .string()
      .max(5000, "Notes must be 5000 characters or fewer")
      .trim()
      .optional()
      .or(z.literal("").transform(() => null))
      .or(z.null()),
    metadata: z
      .record(z.unknown())
      .optional()
      .nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

// ─── Update Referral Status Schema ───────────────────────────────────────────

export const updateReferralStatusSchema = z.object({
  new_status: z.enum(REFERRAL_STATUSES, {
    errorMap: () => ({ message: "Invalid status" }),
  }),
  reason: z
    .string()
    .max(500, "Reason must be 500 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
});

// ─── Search Schema ───────────────────────────────────────────────────────────

export const referralSearchSchema = z.object({
  status: z.enum(REFERRAL_STATUSES).optional(),
  source: z.enum(REFERRAL_SOURCES).optional(),
  priority: z.enum(REFERRAL_PRIORITIES).optional(),
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

// ─── Inferred Types ──────────────────────────────────────────────────────────

export type CreateReferralSchema = z.infer<typeof createReferralSchema>;
export type UpdateReferralSchema = z.infer<typeof updateReferralSchema>;
export type UpdateReferralStatusSchema = z.infer<typeof updateReferralStatusSchema>;
export type ReferralSearchSchema = z.infer<typeof referralSearchSchema>;

// ─── Input Cleaning ──────────────────────────────────────────────────────────

export function cleanReferralInput<
  T extends Record<string, unknown>,
>(input: T): T {
  const cleaned = { ...input };
  for (const [key, value] of Object.entries(cleaned)) {
    if (value === "") {
      cleaned[key as keyof T] = null as T[keyof T];
    }
  }
  return cleaned;
}
