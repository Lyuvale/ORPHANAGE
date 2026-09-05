import { z } from "zod";
import { ADMISSION_STATUSES } from "@/types/admission";

// ─── Create Admission Schema ─────────────────────────────────────────────────

export const createAdmissionSchema = z.object({
  centre_id: z.string().uuid("Invalid centre ID"),
  referral_id: z.string().uuid("Invalid referral ID"),
  decision: z
    .string()
    .max(2000, "Decision must be 2000 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
  conditions: z
    .string()
    .max(5000, "Conditions must be 5000 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
  admitted_date: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date")
    .refine(
      (val) => !val || new Date(val) <= new Date(),
      "Admitted date must be today or in the past",
    )
    .optional()
    .nullable(),
  metadata: z
    .record(z.unknown())
    .optional()
    .nullable(),
});

// ─── Update Admission Schema ─────────────────────────────────────────────────

export const updateAdmissionSchema = z
  .object({
    decision: z
      .string()
      .max(2000, "Decision must be 2000 characters or fewer")
      .trim()
      .optional()
      .or(z.literal("").transform(() => null))
      .or(z.null()),
    conditions: z
      .string()
      .max(5000, "Conditions must be 5000 characters or fewer")
      .trim()
      .optional()
      .or(z.literal("").transform(() => null))
      .or(z.null()),
    admitted_date: z
      .string()
      .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date")
      .refine(
        (val) => !val || new Date(val) <= new Date(),
        "Admitted date must be today or in the past",
      )
      .optional()
      .nullable(),
    metadata: z
      .record(z.unknown())
      .optional()
      .nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

// ─── Update Admission Status Schema ──────────────────────────────────────────

export const updateAdmissionStatusSchema = z.object({
  new_status: z.enum(ADMISSION_STATUSES, {
    errorMap: () => ({ message: "Invalid status" }),
  }),
  reason: z
    .string()
    .max(500, "Reason must be 500 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
  denied_reason: z
    .string()
    .max(2000, "Denied reason must be 2000 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
});

// ─── Search Schema ───────────────────────────────────────────────────────────

export const admissionSearchSchema = z.object({
  status: z.enum(ADMISSION_STATUSES).optional(),
  referral_id: z.string().uuid().optional(),
  child_id: z.string().uuid().optional(),
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

export type CreateAdmissionSchema = z.infer<typeof createAdmissionSchema>;
export type UpdateAdmissionSchema = z.infer<typeof updateAdmissionSchema>;
export type UpdateAdmissionStatusSchema = z.infer<typeof updateAdmissionStatusSchema>;
export type AdmissionSearchSchema = z.infer<typeof admissionSearchSchema>;

// ─── Input Cleaning ──────────────────────────────────────────────────────────

export function cleanAdmissionInput<
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
