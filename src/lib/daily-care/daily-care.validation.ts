import { z } from "zod";
import {
  PRESENCE_STATUSES,
  ABSENCE_REASONS,
} from "@/types/presence";
import {
  MEAL_TYPES,
  CARE_ACTIVITY_TYPES,
  DAILY_NOTE_TYPES,
  FOLLOWUP_STATUSES,
} from "@/types/daily-care";

// ─── Create Presence Schema ─────────────────────────────────

export const createPresenceSchema = z.object({
  centre_id: z.string().uuid("Invalid centre ID"),
  child_id: z.string().uuid("Invalid child ID"),
  presence_date: z
    .string()
    .min(1, "Presence date is required")
    .refine((val) => !isNaN(Date.parse(val)), "Invalid date"),
  status: z
    .enum(PRESENCE_STATUSES, {
      errorMap: () => ({ message: "Invalid presence status" }),
    })
    .optional()
    .default("present"),
  notes: z
    .string()
    .max(5000, "Notes must be 5000 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
});

// ─── Update Presence Schema ─────────────────────────────────

export const updatePresenceSchema = z
  .object({
    status: z.enum(PRESENCE_STATUSES, {
      errorMap: () => ({ message: "Invalid presence status" }),
    }).optional(),
    absence_reason: z
      .enum(ABSENCE_REASONS, {
        errorMap: () => ({ message: "Invalid absence reason" }),
      })
      .optional()
      .nullable(),
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

// ─── Presence Check-In Schema ───────────────────────────────

export const presenceCheckInSchema = z.object({
  notes: z
    .string()
    .max(5000, "Notes must be 5000 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
});

// ─── Presence Check-Out Schema ──────────────────────────────

export const presenceCheckOutSchema = z.object({
  destination_type: z
    .string()
    .max(100, "Destination type must be 100 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
  reason: z
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
});

// ─── Off-Site Schema ────────────────────────────────────────

export const offSiteSchema = z.object({
  off_site_reason: z
    .string()
    .min(1, "Reason is required")
    .max(500, "Reason must be 500 characters or fewer")
    .trim(),
  off_site_destination: z
    .string()
    .max(200, "Destination must be 200 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
  off_site_expected_return: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date")
    .optional()
    .nullable(),
  authorised_by: z
    .string()
    .uuid("Invalid user ID")
    .optional()
    .or(z.literal(""))
    .nullable(),
  visit_id: z
    .string()
    .uuid("Invalid visit ID")
    .optional()
    .or(z.literal(""))
    .nullable(),
});

// ─── Create Daily Care Schema ───────────────────────────────

export const createDailyCareSchema = z.object({
  centre_id: z.string().uuid("Invalid centre ID"),
  child_id: z.string().uuid("Invalid child ID"),
  care_date: z
    .string()
    .min(1, "Care date is required")
    .refine((val) => !isNaN(Date.parse(val)), "Invalid date"),
  activity_type: z.enum(CARE_ACTIVITY_TYPES, {
    errorMap: () => ({ message: "Invalid activity type" }),
  }),
  description: z
    .string()
    .max(2000, "Description must be 2000 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
  time_of_day: z
    .string()
    .optional()
    .or(z.literal(""))
    .nullable(),
  notes: z
    .string()
    .max(5000, "Notes must be 5000 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
});

// ─── Create Meal Schema ─────────────────────────────────────

export const createMealSchema = z.object({
  centre_id: z.string().uuid("Invalid centre ID"),
  child_id: z.string().uuid("Invalid child ID"),
  meal_date: z
    .string()
    .min(1, "Meal date is required")
    .refine((val) => !isNaN(Date.parse(val)), "Invalid date"),
  meal_type: z.enum(MEAL_TYPES, {
    errorMap: () => ({ message: "Invalid meal type" }),
  }),
  provided: z.boolean().optional().default(true),
  time_of_day: z
    .string()
    .optional()
    .or(z.literal(""))
    .nullable(),
  notes: z
    .string()
    .max(2000, "Notes must be 2000 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
});

// ─── Create Daily Note Schema ───────────────────────────────

export const createDailyNoteSchema = z.object({
  centre_id: z.string().uuid("Invalid centre ID"),
  child_id: z.string().uuid("Invalid child ID"),
  note_date: z
    .string()
    .min(1, "Note date is required")
    .refine((val) => !isNaN(Date.parse(val)), "Invalid date"),
  note_type: z
    .enum(DAILY_NOTE_TYPES, {
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

// ─── Amend Daily Note Schema ────────────────────────────────

export const amendDailyNoteSchema = z.object({
  content: z
    .string()
    .min(1, "Content is required")
    .max(20000, "Content must be 20000 characters or fewer")
    .trim(),
  amendment_reason: z
    .string()
    .min(1, "Amendment reason is required")
    .max(500, "Amendment reason must be 500 characters or fewer")
    .trim(),
});

// ─── Create Follow-Up Schema ────────────────────────────────

export const createFollowupSchema = z.object({
  centre_id: z.string().uuid("Invalid centre ID"),
  child_id: z.string().uuid("Invalid child ID"),
  source_note_id: z
    .string()
    .uuid("Invalid note ID")
    .optional()
    .or(z.literal(""))
    .nullable(),
  source_care_id: z
    .string()
    .uuid("Invalid care record ID")
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
  responsible_user_id: z
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

// ─── Update Follow-Up Schema ────────────────────────────────

export const updateFollowupSchema = z
  .object({
    status: z.enum(FOLLOWUP_STATUSES, {
      errorMap: () => ({ message: "Invalid follow-up status" }),
    }).optional(),
    resolution_notes: z
      .string()
      .max(5000, "Resolution notes must be 5000 characters or fewer")
      .trim()
      .optional()
      .or(z.literal("").transform(() => null))
      .or(z.null()),
    due_date: z
      .string()
      .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date")
      .optional()
      .nullable(),
    responsible_user_id: z
      .string()
      .uuid("Invalid user ID")
      .optional()
      .or(z.literal("").transform(() => null))
      .or(z.null()),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

// ─── Search Schemas ─────────────────────────────────────────

export const presenceSearchSchema = z.object({
  child_id: z.string().uuid().optional().or(z.literal("")),
  presence_date: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date")
    .optional()
    .or(z.literal("")),
  status: z.enum(PRESENCE_STATUSES).optional(),
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
      return isNaN(num) ? 50 : Math.min(Math.max(num, 1), 200);
    }),
  offset: z
    .string()
    .optional()
    .transform((val) => {
      const num = parseInt(val ?? "0", 10);
      return isNaN(num) ? 0 : Math.max(num, 0);
    }),
});

export const dailyCareSearchSchema = z.object({
  child_id: z.string().uuid().optional().or(z.literal("")),
  care_date: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date")
    .optional()
    .or(z.literal("")),
  activity_type: z.enum(CARE_ACTIVITY_TYPES).optional(),
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
      return isNaN(num) ? 50 : Math.min(Math.max(num, 1), 200);
    }),
  offset: z
    .string()
    .optional()
    .transform((val) => {
      const num = parseInt(val ?? "0", 10);
      return isNaN(num) ? 0 : Math.max(num, 0);
    }),
});

export const mealSearchSchema = z.object({
  child_id: z.string().uuid().optional().or(z.literal("")),
  meal_date: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date")
    .optional()
    .or(z.literal("")),
  meal_type: z.enum(MEAL_TYPES).optional(),
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
      return isNaN(num) ? 50 : Math.min(Math.max(num, 1), 200);
    }),
  offset: z
    .string()
    .optional()
    .transform((val) => {
      const num = parseInt(val ?? "0", 10);
      return isNaN(num) ? 0 : Math.max(num, 0);
    }),
});

export const dailyNoteSearchSchema = z.object({
  child_id: z.string().uuid().optional().or(z.literal("")),
  note_date: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date")
    .optional()
    .or(z.literal("")),
  note_type: z.enum(DAILY_NOTE_TYPES).optional(),
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
      return isNaN(num) ? 50 : Math.min(Math.max(num, 1), 200);
    }),
  offset: z
    .string()
    .optional()
    .transform((val) => {
      const num = parseInt(val ?? "0", 10);
      return isNaN(num) ? 0 : Math.max(num, 0);
    }),
});

export const followupSearchSchema = z.object({
  child_id: z.string().uuid().optional().or(z.literal("")),
  status: z.enum(FOLLOWUP_STATUSES).optional(),
  responsible_user_id: z.string().uuid().optional().or(z.literal("")),
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
});

// ─── Input Cleaning ─────────────────────────────────────────

export function cleanDailyCareInput<T extends Record<string, unknown>>(
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
