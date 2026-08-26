import { z } from "zod";
import { CHILD_STATUSES, CHILD_GENDERS } from "@/types/child";

// ─── Create Child Schema ─────────────────────────────────────────────────────

export const createChildSchema = z.object({
  centre_id: z.string().uuid("Invalid centre ID"),
  first_name: z
    .string()
    .min(1, "First name is required")
    .max(100, "First name must be 100 characters or fewer")
    .trim(),
  middle_name: z
    .string()
    .max(100, "Middle name must be 100 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
  last_name: z
    .string()
    .min(1, "Last name is required")
    .max(100, "Last name must be 100 characters or fewer")
    .trim(),
  preferred_name: z
    .string()
    .max(100, "Preferred name must be 100 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
  date_of_birth: z
    .string()
    .min(1, "Date of birth is required")
    .refine((val) => !isNaN(Date.parse(val)), "Invalid date of birth")
    .refine(
      (val) => new Date(val) < new Date(),
      "Date of birth must be in the past",
    ),
  gender: z.enum(CHILD_GENDERS, {
    errorMap: () => ({ message: "Invalid gender" }),
  }),
  nationality: z
    .string()
    .max(100, "Nationality must be 100 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
  admission_date: z
    .string()
    .min(1, "Admission date is required")
    .refine((val) => !isNaN(Date.parse(val)), "Invalid admission date")
    .refine(
      (val) => new Date(val) <= new Date(),
      "Admission date must be today or in the past",
    ),
  metadata: z
    .record(z.unknown())
    .optional()
    .nullable(),
});

// ─── Update Child Schema ─────────────────────────────────────────────────────

export const updateChildSchema = z
  .object({
    first_name: z
      .string()
      .min(1, "First name cannot be empty")
      .max(100, "First name must be 100 characters or fewer")
      .trim()
      .optional(),
    middle_name: z
      .string()
      .max(100, "Middle name must be 100 characters or fewer")
      .trim()
      .optional()
      .or(z.literal("").transform(() => null))
      .or(z.null()),
    last_name: z
      .string()
      .min(1, "Last name cannot be empty")
      .max(100, "Last name must be 100 characters or fewer")
      .trim()
      .optional(),
    preferred_name: z
      .string()
      .max(100, "Preferred name must be 100 characters or fewer")
      .trim()
      .optional()
      .or(z.literal("").transform(() => null))
      .or(z.null()),
    date_of_birth: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), "Invalid date of birth")
      .refine(
        (val) => new Date(val) < new Date(),
        "Date of birth must be in the past",
      )
      .optional(),
    gender: z
      .enum(CHILD_GENDERS, {
        errorMap: () => ({ message: "Invalid gender" }),
      })
      .optional(),
    nationality: z
      .string()
      .max(100, "Nationality must be 100 characters or fewer")
      .trim()
      .optional()
      .or(z.literal("").transform(() => null))
      .or(z.null()),
    photo_url: z
      .string()
      .url("Invalid URL")
      .max(500, "URL must be 500 characters or fewer")
      .optional()
      .or(z.literal("")),
    admission_date: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), "Invalid admission date")
      .refine(
        (val) => new Date(val) <= new Date(),
        "Admission date must be today or in the past",
      )
      .optional(),
    metadata: z
      .record(z.unknown())
      .optional()
      .nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

// ─── Update Status Schema ────────────────────────────────────────────────────

export const updateChildStatusSchema = z.object({
  new_status: z.enum(CHILD_STATUSES, {
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

export const childSearchSchema = z.object({
  status: z
    .enum(CHILD_STATUSES)
    .optional(),
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

export type CreateChildSchema = z.infer<typeof createChildSchema>;
export type UpdateChildSchema = z.infer<typeof updateChildSchema>;
export type UpdateChildStatusSchema = z.infer<typeof updateChildStatusSchema>;
export type ChildSearchSchema = z.infer<typeof childSearchSchema>;

// ─── Input Cleaning ──────────────────────────────────────────────────────────

export function cleanChildInput<
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
