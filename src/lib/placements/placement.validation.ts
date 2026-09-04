import { z } from "zod";
import { PLACEMENT_STATUSES, PLACEMENT_TYPES } from "@/types/placement";

// ─── Create Placement Schema ─────────────────────────────────────────────────

export const createPlacementSchema = z.object({
  centre_id: z.string().uuid("Invalid centre ID"),
  child_id: z.string().uuid("Invalid child ID"),
  admission_id: z
    .string()
    .uuid("Invalid admission ID")
    .optional()
    .nullable(),
  bed_reference: z
    .string()
    .max(50, "Bed reference must be 50 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
  room_number: z
    .string()
    .max(50, "Room number must be 50 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
  start_date: z
    .string()
    .min(1, "Start date is required")
    .refine((val) => !isNaN(Date.parse(val)), "Invalid start date")
    .refine(
      (val) => new Date(val) <= new Date(),
      "Start date must be today or in the past",
    ),
  end_date: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid end date")
    .optional()
    .nullable(),
  placement_type: z
    .enum(PLACEMENT_TYPES, {
      errorMap: () => ({ message: "Invalid placement type" }),
    })
    .optional(),
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

// ─── Update Placement Schema ─────────────────────────────────────────────────

export const updatePlacementSchema = z
  .object({
    bed_reference: z
      .string()
      .max(50, "Bed reference must be 50 characters or fewer")
      .trim()
      .optional()
      .or(z.literal("").transform(() => null))
      .or(z.null()),
    room_number: z
      .string()
      .max(50, "Room number must be 50 characters or fewer")
      .trim()
      .optional()
      .or(z.literal("").transform(() => null))
      .or(z.null()),
    end_date: z
      .string()
      .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid end date")
      .optional()
      .nullable(),
    placement_type: z
      .enum(PLACEMENT_TYPES, {
        errorMap: () => ({ message: "Invalid placement type" }),
      })
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

// ─── Update Placement Status Schema ──────────────────────────────────────────

export const updatePlacementStatusSchema = z.object({
  new_status: z.enum(PLACEMENT_STATUSES, {
    errorMap: () => ({ message: "Invalid status" }),
  }),
  reason: z
    .string()
    .max(500, "Reason must be 500 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
  end_date: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid end date")
    .optional()
    .nullable(),
});

// ─── Search Schema ───────────────────────────────────────────────────────────

export const placementSearchSchema = z.object({
  status: z.enum(PLACEMENT_STATUSES).optional(),
  child_id: z.string().uuid().optional(),
  child_ids: z.array(z.string().uuid()).optional(),
  placement_type: z.enum(PLACEMENT_TYPES).optional(),
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

export type CreatePlacementSchema = z.infer<typeof createPlacementSchema>;
export type UpdatePlacementSchema = z.infer<typeof updatePlacementSchema>;
export type UpdatePlacementStatusSchema = z.infer<typeof updatePlacementStatusSchema>;
export type PlacementSearchSchema = z.infer<typeof placementSearchSchema>;

// ─── Input Cleaning ──────────────────────────────────────────────────────────

export function cleanPlacementInput<
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
