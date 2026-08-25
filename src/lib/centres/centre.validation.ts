import { z } from "zod";
import { CENTRE_STATUSES, CENTRE_DEFAULT_COUNTRY } from "@/types/centre";

const centreCodeRegex = /^[A-Za-z0-9_-]+$/;

export const createCentreSchema = z.object({
  name: z
    .string()
    .min(1, "Centre name is required")
    .max(200, "Centre name must be 200 characters or fewer"),
  code: z
    .string()
    .min(2, "Centre code must be at least 2 characters")
    .max(50, "Centre code must be 50 characters or fewer")
    .regex(centreCodeRegex, "Centre code may only contain letters, numbers, hyphens, and underscores"),
  contact_email: z
    .string()
    .email("Invalid email address")
    .max(255, "Email must be 255 characters or fewer")
    .optional()
    .or(z.literal("")),
  contact_phone: z
    .string()
    .max(30, "Phone must be 30 characters or fewer")
    .optional()
    .or(z.literal("")),
  address_line1: z
    .string()
    .max(255, "Address line 1 must be 255 characters or fewer")
    .optional()
    .or(z.literal("")),
  address_line2: z
    .string()
    .max(255, "Address line 2 must be 255 characters or fewer")
    .optional()
    .or(z.literal("")),
  city: z
    .string()
    .max(100, "City must be 100 characters or fewer")
    .optional()
    .or(z.literal("")),
  state: z
    .string()
    .max(100, "State must be 100 characters or fewer")
    .optional()
    .or(z.literal("")),
  postal_code: z
    .string()
    .max(20, "Postal code must be 20 characters or fewer")
    .optional()
    .or(z.literal("")),
  country: z
    .string()
    .max(100, "Country must be 100 characters or fewer")
    .default(CENTRE_DEFAULT_COUNTRY),
  status: z.enum(CENTRE_STATUSES, { message: "Invalid centre status" }).optional(),
});

export const updateCentreSchema = z.object({
  name: z
    .string()
    .min(1, "Centre name is required")
    .max(200, "Centre name must be 200 characters or fewer")
    .optional(),
  code: z
    .string()
    .min(2, "Centre code must be at least 2 characters")
    .max(50, "Centre code must be 50 characters or fewer")
    .regex(centreCodeRegex, "Centre code may only contain letters, numbers, hyphens, and underscores")
    .optional(),
  contact_email: z
    .string()
    .email("Invalid email address")
    .max(255, "Email must be 255 characters or fewer")
    .optional()
    .or(z.literal("")),
  contact_phone: z
    .string()
    .max(30, "Phone must be 30 characters or fewer")
    .optional()
    .or(z.literal("")),
  address_line1: z
    .string()
    .max(255, "Address line 1 must be 255 characters or fewer")
    .optional()
    .or(z.literal("")),
  address_line2: z
    .string()
    .max(255, "Address line 2 must be 255 characters or fewer")
    .optional()
    .or(z.literal("")),
  city: z
    .string()
    .max(100, "City must be 100 characters or fewer")
    .optional()
    .or(z.literal("")),
  state: z
    .string()
    .max(100, "State must be 100 characters or fewer")
    .optional()
    .or(z.literal("")),
  postal_code: z
    .string()
    .max(20, "Postal code must be 20 characters or fewer")
    .optional()
    .or(z.literal("")),
  country: z
    .string()
    .max(100, "Country must be 100 characters or fewer")
    .optional(),
  status: z.enum(CENTRE_STATUSES, { message: "Invalid centre status" }).optional(),
});

export type CreateCentreSchema = z.infer<typeof createCentreSchema>;
export type UpdateCentreSchema = z.infer<typeof updateCentreSchema>;

/**
 * Clean empty strings to null for optional fields before validation.
 */
export function cleanCentreInput(input: Record<string, unknown>): Record<string, unknown> {
  const cleaned = { ...input };
  for (const key of Object.keys(cleaned)) {
    if (cleaned[key] === "") {
      cleaned[key] = null;
    }
  }
  return cleaned;
}
