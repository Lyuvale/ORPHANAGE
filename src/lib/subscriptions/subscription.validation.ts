import { z } from "zod";
import {
  SUBSCRIPTION_STATUSES,
  BILLING_PERIODS,
  PLAN_FEATURE_KEYS,
} from "@/types/subscription";

const dateOrNull = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
  .nullable()
  .optional();

export const createPlanSchema = z.object({
  name: z.string().min(1, "Plan name is required").max(120, "Plan name must be 120 characters or fewer"),
  description: z.string().max(500, "Description must be 500 characters or fewer").nullable().optional(),
  price: z.coerce.number().min(0, "Price must be zero or more").max(1_000_000, "Price is too large").optional(),
  billing_period: z.enum(BILLING_PERIODS, { message: "Invalid billing period" }).optional(),
  is_active: z.boolean().optional(),
});

export const updatePlanSchema = z.object({
  name: z.string().min(1, "Plan name is required").max(120, "Plan name must be 120 characters or fewer").optional(),
  description: z.string().max(500, "Description must be 500 characters or fewer").nullable().optional(),
  price: z.coerce.number().min(0, "Price must be zero or more").max(1_000_000, "Price is too large").optional(),
  billing_period: z.enum(BILLING_PERIODS, { message: "Invalid billing period" }).optional(),
  is_active: z.boolean().optional(),
});

export const setPlanFeaturesSchema = z.object({
  features: z
    .array(
      z.object({
        feature_key: z.enum(PLAN_FEATURE_KEYS, { message: "Unknown feature key" }),
        feature_label: z.string().max(120, "Label must be 120 characters or fewer").nullable().optional(),
        enabled: z.boolean(),
      }),
    )
    .max(50, "Too many features"),
});

export const createSubscriptionSchema = z.object({
  centre_id: z.string().min(1, "Centre is required"),
  plan_id: z.string().min(1, "Plan is required"),
  status: z.enum(SUBSCRIPTION_STATUSES, { message: "Invalid subscription status" }).optional(),
  start_date: dateOrNull,
  end_date: dateOrNull,
  trial_ends_at: dateOrNull,
  payment_status: z.string().max(50, "Payment status is too long").nullable().optional(),
  payment_provider: z.string().max(100, "Payment provider is too long").nullable().optional(),
  payment_reference: z.string().max(200, "Payment reference is too long").nullable().optional(),
});

export const setSubscriptionStatusSchema = z.object({
  status: z.enum(SUBSCRIPTION_STATUSES, { message: "Invalid subscription status" }),
  reason: z.string().max(500, "Reason is too long").optional(),
  end_date: dateOrNull,
});

export const extendSubscriptionSchema = z.object({
  end_date: dateOrNull,
  trial_ends_at: dateOrNull,
  reason: z.string().max(500, "Reason is too long").optional(),
});

export type CreatePlanSchema = z.infer<typeof createPlanSchema>;
export type UpdatePlanSchema = z.infer<typeof updatePlanSchema>;
export type SetPlanFeaturesSchema = z.infer<typeof setPlanFeaturesSchema>;
export type CreateSubscriptionSchema = z.infer<typeof createSubscriptionSchema>;
export type SetSubscriptionStatusSchema = z.infer<typeof setSubscriptionStatusSchema>;
export type ExtendSubscriptionSchema = z.infer<typeof extendSubscriptionSchema>;

/** Coerce empty strings to null for optional fields before validation. */
export function cleanSubscriptionInput(input: Record<string, unknown>): Record<string, unknown> {
  const cleaned = { ...input };
  for (const key of Object.keys(cleaned)) {
    if (cleaned[key] === "") {
      cleaned[key] = null;
    }
  }
  return cleaned;
}
