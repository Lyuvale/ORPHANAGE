import { z } from "zod";
import {
  GUARDIAN_STATUSES,
  RELATIONSHIP_TYPES,
  LEGAL_AUTHORITY_TYPES,
} from "@/types/guardian";

// ─── Create Guardian Schema ──────────────────────────────────

export const createGuardianSchema = z.object({
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
  gender: z
    .string()
    .refine(
      (val) => !val || ["male", "female", "other", "undisclosed"].includes(val),
      "Invalid gender",
    )
    .optional()
    .nullable(),
  date_of_birth: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date of birth")
    .optional()
    .nullable(),
  phone: z
    .string()
    .max(30, "Phone must be 30 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
  alternative_phone: z
    .string()
    .max(30, "Alternative phone must be 30 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .email("Invalid email address")
    .max(200, "Email must be 200 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
  address: z
    .string()
    .max(500, "Address must be 500 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
  occupation: z
    .string()
    .max(200, "Occupation must be 200 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
  id_reference: z
    .string()
    .max(100, "ID reference must be 100 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
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

// ─── Update Guardian Schema ──────────────────────────────────

export const updateGuardianSchema = z
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
    gender: z
      .string()
      .refine(
        (val) => !val || ["male", "female", "other", "undisclosed"].includes(val),
        "Invalid gender",
      )
      .optional()
      .nullable(),
    date_of_birth: z
      .string()
      .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date of birth")
      .optional()
      .nullable(),
    phone: z
      .string()
      .max(30, "Phone must be 30 characters or fewer")
      .trim()
      .optional()
      .or(z.literal("").transform(() => null))
      .or(z.null()),
    alternative_phone: z
      .string()
      .max(30, "Alternative phone must be 30 characters or fewer")
      .trim()
      .optional()
      .or(z.literal("").transform(() => null))
      .or(z.null()),
    email: z
      .string()
      .email("Invalid email address")
      .max(200, "Email must be 200 characters or fewer")
      .trim()
      .optional()
      .or(z.literal("").transform(() => null))
      .or(z.null()),
    address: z
      .string()
      .max(500, "Address must be 500 characters or fewer")
      .trim()
      .optional()
      .or(z.literal("").transform(() => null))
      .or(z.null()),
    occupation: z
      .string()
      .max(200, "Occupation must be 200 characters or fewer")
      .trim()
      .optional()
      .or(z.literal("").transform(() => null))
      .or(z.null()),
    id_reference: z
      .string()
      .max(100, "ID reference must be 100 characters or fewer")
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
    metadata: z
      .record(z.unknown())
      .optional()
      .nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

// ─── Update Guardian Status Schema ───────────────────────────

export const updateGuardianStatusSchema = z.object({
  new_status: z.enum(GUARDIAN_STATUSES, {
    errorMap: () => ({ message: "Invalid guardian status" }),
  }),
  reason: z
    .string()
    .max(500, "Reason must be 500 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
});

// ─── Create Relationship Schema ──────────────────────────────

export const createRelationshipSchema = z.object({
  child_id: z.string().uuid("Invalid child ID"),
  guardian_id: z.string().uuid("Invalid guardian ID"),
  centre_id: z.string().uuid("Invalid centre ID"),
  relationship_type: z.enum(RELATIONSHIP_TYPES, {
    errorMap: () => ({ message: "Invalid relationship type" }),
  }),
  is_primary: z.boolean().optional().default(false),
  start_date: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date")
    .optional()
    .nullable(),
  legal_authority: z
    .enum(LEGAL_AUTHORITY_TYPES, {
      errorMap: () => ({ message: "Invalid legal authority type" }),
    })
    .optional()
    .default("none"),
  contact_permitted: z.boolean().optional().default(true),
  updates_permitted: z.boolean().optional().default(true),
  visit_permitted: z.boolean().optional().default(true),
  meeting_permitted: z.boolean().optional().default(true),
  information_permitted: z.boolean().optional().default(true),
  notes: z
    .string()
    .max(5000, "Notes must be 5000 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
});

// ─── Update Relationship Schema ──────────────────────────────

export const updateRelationshipSchema = z
  .object({
    relationship_type: z.enum(RELATIONSHIP_TYPES, {
      errorMap: () => ({ message: "Invalid relationship type" }),
    }).optional(),
    is_primary: z.boolean().optional(),
    legal_authority: z.enum(LEGAL_AUTHORITY_TYPES, {
      errorMap: () => ({ message: "Invalid legal authority type" }),
    }).optional(),
    contact_permitted: z.boolean().optional(),
    updates_permitted: z.boolean().optional(),
    visit_permitted: z.boolean().optional(),
    meeting_permitted: z.boolean().optional(),
    information_permitted: z.boolean().optional(),
    contact_restricted: z.boolean().optional(),
    visits_restricted: z.boolean().optional(),
    restriction_notes: z
      .string()
      .max(5000, "Notes must be 5000 characters or fewer")
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

// ─── End Relationship Schema ─────────────────────────────────

export const endRelationshipSchema = z.object({
  end_date: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date")
    .optional()
    .nullable(),
  reason: z
    .string()
    .max(500, "Reason must be 500 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
});

// ─── Guardian Search Schema ──────────────────────────────────

export const guardianSearchSchema = z.object({
  status: z.enum(GUARDIAN_STATUSES).optional(),
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

export type CreateGuardianSchema = z.infer<typeof createGuardianSchema>;
export type UpdateGuardianSchema = z.infer<typeof updateGuardianSchema>;
export type UpdateGuardianStatusSchema = z.infer<typeof updateGuardianStatusSchema>;
export type CreateRelationshipSchema = z.infer<typeof createRelationshipSchema>;
export type UpdateRelationshipSchema = z.infer<typeof updateRelationshipSchema>;
export type EndRelationshipSchema = z.infer<typeof endRelationshipSchema>;
export type GuardianSearchSchema = z.infer<typeof guardianSearchSchema>;

// ─── Input Cleaning ──────────────────────────────────────────

export function cleanGuardianInput<
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
