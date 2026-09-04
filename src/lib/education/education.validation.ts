import { z } from "zod";
import {
  EDUCATION_STATUSES,
  EDUCATION_SUPPORT_TYPES,
  EDUCATION_SUPPORT_PRIORITIES,
  EDUCATION_SUPPORT_STATUSES,
  EDUCATION_GOAL_STATUSES,
  EDUCATION_PROGRESS_STATUSES,
  EDUCATION_ACHIEVEMENT_CATEGORIES,
} from "@/types/education";

// ─── Shared field helpers ───────────────────────────────────

const optionalDateString = () =>
  z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date")
    .optional()
    .nullable();

const dateString = () =>
  z
    .string()
    .min(1, "Date is required")
    .refine((val) => !isNaN(Date.parse(val)), "Invalid date");

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

// ─── Education Profile Schemas ──────────────────────────────

export const createEducationProfileSchema = z.object({
  centre_id: z.string().uuid("Invalid centre ID"),
  child_id: z.string().uuid("Invalid child ID"),
  education_status: z.enum(EDUCATION_STATUSES, {
    errorMap: () => ({ message: "Invalid education status" }),
  }).optional(),
  school_name: optionalText(200, "School / institution name"),
  education_level: optionalText(200, "Education level"),
  general_status: optionalText(500, "General education status"),
  notes: optionalText(2000, "Notes"),
});

export const updateEducationProfileSchema = z
  .object({
    education_status: z.enum(EDUCATION_STATUSES, {
      errorMap: () => ({ message: "Invalid education status" }),
    }).optional(),
    school_name: optionalText(200, "School / institution name"),
    education_level: optionalText(200, "Education level"),
    general_status: optionalText(500, "General education status"),
    notes: optionalText(2000, "Notes"),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

// ─── Education Support Needs ────────────────────────────────

export const createEducationSupportNeedSchema = z.object({
  centre_id: z.string().uuid("Invalid centre ID"),
  child_id: z.string().uuid("Invalid child ID"),
  support_type: z.enum(EDUCATION_SUPPORT_TYPES, {
    errorMap: () => ({ message: "Invalid support type" }),
  }),
  description: optionalText(2000, "Description"),
  identified_date: optionalDateString(),
  priority: z.enum(EDUCATION_SUPPORT_PRIORITIES, {
    errorMap: () => ({ message: "Invalid priority" }),
  }).optional(),
  status: z.enum(EDUCATION_SUPPORT_STATUSES, {
    errorMap: () => ({ message: "Invalid status" }),
  }).optional(),
  notes: optionalText(2000, "Notes"),
});

export const updateEducationSupportNeedSchema = z
  .object({
    support_type: z.enum(EDUCATION_SUPPORT_TYPES, {
      errorMap: () => ({ message: "Invalid support type" }),
    }).optional(),
    description: optionalText(2000, "Description"),
    identified_date: optionalDateString(),
    priority: z.enum(EDUCATION_SUPPORT_PRIORITIES, {
      errorMap: () => ({ message: "Invalid priority" }),
    }).optional(),
    status: z.enum(EDUCATION_SUPPORT_STATUSES, {
      errorMap: () => ({ message: "Invalid status" }),
    }).optional(),
    notes: optionalText(2000, "Notes"),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

// ─── Development Goals ──────────────────────────────────────

export const createEducationGoalSchema = z.object({
  centre_id: z.string().uuid("Invalid centre ID"),
  child_id: z.string().uuid("Invalid child ID"),
  title: requiredText(300, "Goal title"),
  description: optionalText(2000, "Description"),
  start_date: optionalDateString(),
  target_date: optionalDateString(),
  status: z.enum(EDUCATION_GOAL_STATUSES, {
    errorMap: () => ({ message: "Invalid goal status" }),
  }).optional(),
});

export const updateEducationGoalSchema = z
  .object({
    title: optionalText(300, "Goal title"),
    description: optionalText(2000, "Description"),
    start_date: optionalDateString(),
    target_date: optionalDateString(),
    status: z.enum(EDUCATION_GOAL_STATUSES, {
      errorMap: () => ({ message: "Invalid goal status" }),
    }).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

// ─── Progress (append-only) ─────────────────────────────────

export const createEducationProgressSchema = z.object({
  centre_id: z.string().uuid("Invalid centre ID"),
  child_id: z.string().uuid("Invalid child ID"),
  goal_id: z.string().uuid("Invalid goal ID"),
  progress_date: dateString().optional(),
  progress_status: z.enum(EDUCATION_PROGRESS_STATUSES, {
    errorMap: () => ({ message: "Invalid progress status" }),
  }).optional(),
  observation: optionalText(5000, "Observation"),
});

// ─── Achievements ───────────────────────────────────────────

export const createEducationAchievementSchema = z.object({
  centre_id: z.string().uuid("Invalid centre ID"),
  child_id: z.string().uuid("Invalid child ID"),
  title: requiredText(300, "Achievement title"),
  description: optionalText(2000, "Description"),
  achievement_date: optionalDateString(),
  category: z.enum(EDUCATION_ACHIEVEMENT_CATEGORIES, {
    errorMap: () => ({ message: "Invalid achievement category" }),
  }).optional(),
  evidence_reference: optionalText(500, "Evidence reference"),
});

// ─── Search Schemas ─────────────────────────────────────────

const baseSearchShape = {
  child_id: z.string().uuid().optional().or(z.literal("")),
  child_ids: z.array(z.string().uuid()).optional(),
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

export const educationSearchSchema = z.object({ ...baseSearchShape });

export const supportNeedSearchSchema = z.object({
  ...baseSearchShape,
  status: z.enum(EDUCATION_SUPPORT_STATUSES).optional(),
  priority: z.enum(EDUCATION_SUPPORT_PRIORITIES).optional(),
});

export const goalSearchSchema = z.object({
  ...baseSearchShape,
  status: z.enum(EDUCATION_GOAL_STATUSES).optional(),
});

export const progressSearchSchema = z.object({
  ...baseSearchShape,
  goal_id: z.string().uuid().optional().or(z.literal("")),
});

export const achievementSearchSchema = z.object({
  ...baseSearchShape,
  category: z.enum(EDUCATION_ACHIEVEMENT_CATEGORIES).optional(),
});

// ─── Input Cleaning ─────────────────────────────────────────

export function cleanEducationInput<T extends Record<string, unknown>>(input: T): T {
  const cleaned = { ...input };
  for (const [key, value] of Object.entries(cleaned)) {
    if (value === "") {
      cleaned[key as keyof T] = null as T[keyof T];
    }
  }
  return cleaned;
}
