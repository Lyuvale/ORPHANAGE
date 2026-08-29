import { z } from "zod";
import {
  STAFF_STATUSES,
  STAFF_HISTORY_EVENTS,
  STAFF_TRAINING_STATUSES,
  STAFF_VERIFICATION_STATUSES,
} from "@/types/staff";
import { CENTRE_ROLES } from "@/types/role";

// ─── Shared field helpers ───────────────────────────────────

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

// ─── Staff Profile Schemas ──────────────────────────────────

export const createStaffSchema = z.object({
  centre_id: z.string().uuid("Invalid centre ID"),
  user_profile_id: z.string().uuid("Invalid user profile ID").optional().nullable(),
  staff_identifier: optionalText(100, "Staff identifier"),
  job_title: requiredText(200, "Job title"),
  department: optionalText(200, "Department / unit"),
  operational_role: z.enum(CENTRE_ROLES, {
    errorMap: () => ({ message: "Invalid operational role" }),
  }).optional().nullable(),
  employment_status: z.enum(STAFF_STATUSES, {
    errorMap: () => ({ message: "Invalid employment status" }),
  }).optional(),
  start_date: optionalDateString(),
  end_date: optionalDateString(),
  work_phone: optionalText(50, "Work phone"),
  work_email: optionalText(200, "Work email").refine(
    (val) => !val || z.string().email().safeParse(val).success,
    "Invalid work email",
  ),
  notes: optionalText(2000, "Notes"),
});

export const updateStaffSchema = z
  .object({
    user_profile_id: z.string().uuid("Invalid user profile ID").optional().nullable(),
    staff_identifier: optionalText(100, "Staff identifier"),
    job_title: optionalText(200, "Job title"),
    department: optionalText(200, "Department / unit"),
    operational_role: z.enum(CENTRE_ROLES, {
      errorMap: () => ({ message: "Invalid operational role" }),
    }).optional().nullable(),
    employment_status: z.enum(STAFF_STATUSES, {
      errorMap: () => ({ message: "Invalid employment status" }),
    }).optional(),
    start_date: optionalDateString(),
    end_date: optionalDateString(),
    work_phone: optionalText(50, "Work phone"),
    work_email: optionalText(200, "Work email").refine(
      (val) => !val || z.string().email().safeParse(val).success,
      "Invalid work email",
    ),
    notes: optionalText(2000, "Notes"),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const staffStatusSchema = z.object({
  status: z.enum(STAFF_STATUSES, {
    errorMap: () => ({ message: "Invalid employment status" }),
  }),
});

// ─── Staff History ──────────────────────────────────────────

export const createStaffHistorySchema = z.object({
  event_type: z.enum(STAFF_HISTORY_EVENTS, {
    errorMap: () => ({ message: "Invalid history event type" }),
  }),
  description: optionalText(1000, "Description"),
});

// ─── Staff Assignments ──────────────────────────────────────

export const createStaffAssignmentSchema = z.object({
  centre_id: z.string().uuid("Invalid centre ID"),
  staff_id: z.string().uuid("Invalid staff ID"),
  responsibility_type: requiredText(200, "Responsibility type"),
  description: optionalText(2000, "Description"),
  assigned_date: optionalDateString(),
});

// ─── Staff Training ─────────────────────────────────────────

export const createStaffTrainingSchema = z.object({
  centre_id: z.string().uuid("Invalid centre ID"),
  staff_id: z.string().uuid("Invalid staff ID"),
  training_title: requiredText(300, "Training title"),
  provider: optionalText(200, "Provider"),
  training_date: optionalDateString(),
  due_date: optionalDateString(),
  completion_status: z.enum(STAFF_TRAINING_STATUSES, {
    errorMap: () => ({ message: "Invalid completion status" }),
  }).optional(),
  certificate_reference: optionalText(200, "Certificate / reference"),
  expiry_date: optionalDateString(),
  notes: optionalText(2000, "Notes"),
});

export const updateStaffTrainingSchema = z
  .object({
    training_title: optionalText(300, "Training title"),
    provider: optionalText(200, "Provider"),
    training_date: optionalDateString(),
    due_date: optionalDateString(),
    completion_status: z.enum(STAFF_TRAINING_STATUSES, {
      errorMap: () => ({ message: "Invalid completion status" }),
    }).optional(),
    certificate_reference: optionalText(200, "Certificate / reference"),
    expiry_date: optionalDateString(),
    notes: optionalText(2000, "Notes"),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

// ─── Staff Qualifications ───────────────────────────────────

export const createStaffQualificationSchema = z.object({
  centre_id: z.string().uuid("Invalid centre ID"),
  staff_id: z.string().uuid("Invalid staff ID"),
  qualification: requiredText(300, "Qualification"),
  institution: optionalText(300, "Institution"),
  qualification_year: optionalText(4, "Year").refine(
    (val) => !val || /^\d{4}$/.test(val),
    "Year must be a 4-digit year",
  ),
  verification_status: z.enum(STAFF_VERIFICATION_STATUSES, {
    errorMap: () => ({ message: "Invalid verification status" }),
  }).optional(),
  notes: optionalText(2000, "Notes"),
});

// ─── Staff Emergency Contacts ───────────────────────────────

export const createStaffEmergencyContactSchema = z.object({
  centre_id: z.string().uuid("Invalid centre ID"),
  staff_id: z.string().uuid("Invalid staff ID"),
  contact_name: requiredText(200, "Contact name"),
  relationship: optionalText(100, "Relationship"),
  phone: optionalText(50, "Phone"),
  email: optionalText(200, "Email"),
});

// ─── Search Schema ──────────────────────────────────────────

const baseSearchShape = {
  search: z.string().optional(),
  employment_status: z.enum(STAFF_STATUSES).optional(),
  operational_role: z.enum(CENTRE_ROLES).optional(),
  department: z.string().optional(),
  limit: z
    .string()
    .optional()
    .transform((val) => {
      const num = parseInt(val ?? "50", 10);
      return isNaN(num) ? 50 : Math.min(Math.max(num, 1), 200);
    }),
  offset: z
    .string()
    .optional()
    .transform((val) => {
      const num = parseInt(val ?? "0", 10);
      return isNaN(num) ? 0 : Math.max(num, 0);
    }),
};

export const staffSearchSchema = z.object({ ...baseSearchShape });

// ─── Input Cleaning ─────────────────────────────────────────

export function cleanStaffInput<T extends Record<string, unknown>>(input: T): T {
  const cleaned = { ...input };
  for (const [key, value] of Object.entries(cleaned)) {
    if (value === "") {
      cleaned[key as keyof T] = null as T[keyof T];
    }
  }
  return cleaned;
}