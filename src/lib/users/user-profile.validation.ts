import { z } from "zod";

export const createUserProfileSchema = z.object({
  auth_user_id: z.string().uuid("Invalid auth user ID"),
  centre_id: z.string().uuid("Invalid centre ID"),
  first_name: z
    .string()
    .min(1, "First name is required")
    .max(100, "First name must be 100 characters or fewer"),
  middle_name: z
    .string()
    .max(100, "Middle name must be 100 characters or fewer")
    .optional()
    .or(z.literal("")),
  last_name: z
    .string()
    .min(1, "Last name is required")
    .max(100, "Last name must be 100 characters or fewer"),
  phone: z
    .string()
    .max(30, "Phone must be 30 characters or fewer")
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .email("Invalid email address")
    .max(255, "Email must be 255 characters or fewer")
    .optional()
    .or(z.literal("")),
  status: z.enum(["active", "deactivated"], { message: "Invalid status" }).optional(),
});

export const updateUserProfileSchema = z.object({
  centre_id: z.string().uuid("Invalid centre ID").optional(),
  first_name: z
    .string()
    .min(1, "First name is required")
    .max(100, "First name must be 100 characters or fewer")
    .optional(),
  middle_name: z
    .string()
    .max(100, "Middle name must be 100 characters or fewer")
    .optional()
    .or(z.literal("")),
  last_name: z
    .string()
    .min(1, "Last name is required")
    .max(100, "Last name must be 100 characters or fewer")
    .optional(),
  phone: z
    .string()
    .max(30, "Phone must be 30 characters or fewer")
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .email("Invalid email address")
    .max(255, "Email must be 255 characters or fewer")
    .optional()
    .or(z.literal("")),
  status: z.enum(["active", "deactivated"], { message: "Invalid status" }).optional(),
});

export type CreateUserProfileSchema = z.infer<typeof createUserProfileSchema>;
export type UpdateUserProfileSchema = z.infer<typeof updateUserProfileSchema>;
