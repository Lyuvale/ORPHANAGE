import { z } from "zod";
import { CENTRE_NEED_STATUSES } from "@/types/centre-need";

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer`)
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null));

// Safe positive amount: accepts numbers or numeric strings from forms.
const targetAmount = z
  .union([z.number().finite(), z.string()])
  .transform((value, ctx) => {
    const n = typeof value === "string" ? Number(value) : value;
    if (!Number.isFinite(n)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Target amount must be a number",
      });
      return z.NEVER;
    }
    if (n <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Target amount must be greater than 0",
      });
      return z.NEVER;
    }
    if (n > 999_999_999_999.99) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Target amount is too large",
      });
      return z.NEVER;
    }
    return Math.round(n * 100) / 100;
  });

const imageUrl = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? null : value,
  z
    .string()
    .trim()
    .max(2048, "Image URL must be 2048 characters or fewer")
    .url("Image URL must be a valid URL")
    .nullable()
    .optional(),
);

export const createCentreNeedSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or fewer"),
  description: optionalText(5000, "Description"),
  image_url: imageUrl,
  target_amount: targetAmount,
  status: z
    .enum(CENTRE_NEED_STATUSES, {
      errorMap: () => ({ message: "Invalid need status" }),
    })
    .optional(),
  is_public: z.boolean().optional(),
  sort_order: z.coerce
    .number()
    .int("Sort order must be a whole number")
    .min(-9999)
    .max(9999)
    .optional(),
});

export const updateCentreNeedSchema = createCentreNeedSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export type CreateCentreNeedData = z.infer<typeof createCentreNeedSchema>;
export type UpdateCentreNeedData = z.infer<typeof updateCentreNeedSchema>;
