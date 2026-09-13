import { z } from "zod";
import { SITE_FONT_OPTIONS } from "@/types/centre-site";

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex colour like #4f46e5");

const optionalUrl = z
  .string()
  .url("Must be a valid URL")
  .startsWith("https://", "Only https:// URLs are allowed")
  .or(z.literal(""))
  .nullable()
  .optional();

const fontValues = SITE_FONT_OPTIONS.map((f) => f.value);

const blockBase = { id: z.string().min(1) };

export const sitePageBlockSchema = z.discriminatedUnion("type", [
  z.object({
    ...blockBase,
    type: z.literal("heading"),
    data: z.object({ level: z.union([z.literal(1), z.literal(2), z.literal(3)]), text: z.string().min(1) }),
  }),
  z.object({
    ...blockBase,
    type: z.literal("paragraph"),
    data: z.object({ text: z.string() }),
  }),
  z.object({
    ...blockBase,
    type: z.literal("image"),
    data: z.object({ src: z.string().min(1), alt: z.string().optional(), caption: z.string().optional() }),
  }),
  z.object({
    ...blockBase,
    type: z.literal("button"),
    data: z.object({ label: z.string().min(1), href: z.string().min(1) }),
  }),
  z.object({
    ...blockBase,
    type: z.literal("list"),
    data: z.object({ items: z.array(z.string().min(1)).min(1), ordered: z.boolean().optional() }),
  }),
  z.object({
    ...blockBase,
    type: z.literal("quote"),
    data: z.object({ text: z.string().min(1), attribution: z.string().optional() }),
  }),
  z.object({
    ...blockBase,
    type: z.literal("divider"),
    data: z.object({}).optional(),
  }),
  z.object({
    ...blockBase,
    type: z.literal("video"),
    data: z.object({ url: z.string().min(1) }),
  }),
  z.object({
    ...blockBase,
    type: z.literal("embed_html"),
    data: z.object({ html: z.string() }),
  }),
  z.object({
    ...blockBase,
    type: z.literal("donation"),
    data: z.object({
      title: z.string().max(200).optional(),
      description: z.string().max(1000).optional(),
    }),
  }),
]);

export const sitePageInputSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  slug: z.string().trim().regex(/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, numbers and dashes").max(200).optional(),
  nav_label: z.string().max(100).nullable().optional(),
  show_in_nav: z.boolean().optional(),
  nav_order: z.number().int().min(-9999).max(9999).optional(),
  is_published: z.boolean().optional(),
  is_home: z.boolean().optional(),
  meta_description: z.string().max(300).nullable().optional(),
  content: z.array(sitePageBlockSchema).optional(),
});

export const sitePagePatchSchema = sitePageInputSchema.partial();

export const siteThemeInputSchema = z.object({
  site_name: z.string().max(120).optional(),
  tagline: z.string().max(300).nullable().optional(),
  primary_color: hexColor.optional(),
  accent_color: hexColor.optional(),
  heading_font: z.enum(fontValues as [string, ...string[]]).optional(),
  body_font: z.enum(fontValues as [string, ...string[]]).optional(),
  logo_url: optionalUrl,
  favicon_url: optionalUrl,
  hero_image_url: optionalUrl,
  footer_text: z.string().max(1000).nullable().optional(),
  contact_email: z.string().email("Must be a valid email").nullable().optional(),
  contact_phone: z.string().max(40).nullable().optional(),
  custom_css: z.string().max(20000).nullable().optional(),
});

export type SitePageInput = z.infer<typeof sitePageInputSchema>;
export type SitePagePatch = z.infer<typeof sitePagePatchSchema>;
export type SiteThemeInput = z.infer<typeof siteThemeInputSchema>;