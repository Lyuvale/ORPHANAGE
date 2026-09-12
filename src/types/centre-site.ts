/**
 * Centre website types.
 *
 * Every centre can build its own public website: a set of pages plus an
 * appearance (theme). Pages hold content as a validated JSON block array.
 * Only published pages are exposed publicly.
 */

export type SiteBlockBase = {
  id: string;
  type: string;
};

export type SiteHeadingBlock = SiteBlockBase & {
  type: "heading";
  data: { level: 1 | 2 | 3; text: string };
};

export type SiteParagraphBlock = SiteBlockBase & {
  type: "paragraph";
  data: { text: string };
};

export type SiteImageBlock = SiteBlockBase & {
  type: "image";
  data: { src: string; alt?: string; caption?: string };
};

export type SiteButtonBlock = SiteBlockBase & {
  type: "button";
  data: { label: string; href: string };
};

export type SiteListBlock = SiteBlockBase & {
  type: "list";
  data: { items: string[]; ordered?: boolean };
};

export type SiteQuoteBlock = SiteBlockBase & {
  type: "quote";
  data: { text: string; attribution?: string };
};

export type SiteDividerBlock = SiteBlockBase & {
  type: "divider";
  data: Record<string, never>;
};

export type SiteVideoBlock = SiteBlockBase & {
  type: "video";
  data: { url: string };
};

export type SiteEmbedBlock = SiteBlockBase & {
  type: "embed_html";
  data: { html: string };
};

export type SitePageBlock =
  | SiteHeadingBlock
  | SiteParagraphBlock
  | SiteImageBlock
  | SiteButtonBlock
  | SiteListBlock
  | SiteQuoteBlock
  | SiteDividerBlock
  | SiteVideoBlock
  | SiteEmbedBlock;

export const SITE_BLOCK_TYPES = [
  "heading",
  "paragraph",
  "image",
  "button",
  "list",
  "quote",
  "divider",
  "video",
  "embed_html",
] as const;

export type SiteBlockType = (typeof SITE_BLOCK_TYPES)[number];

export interface SitePage {
  id: string;
  centre_id: string;
  title: string;
  slug: string;
  nav_label: string | null;
  show_in_nav: boolean;
  nav_order: number;
  is_published: boolean;
  is_home: boolean;
  meta_description: string | null;
  content: SitePageBlock[];
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SiteTheme {
  centre_id: string;
  site_name: string;
  tagline: string | null;
  primary_color: string;
  accent_color: string;
  heading_font: string;
  body_font: string;
  logo_url: string | null;
  favicon_url: string | null;
  hero_image_url: string | null;
  footer_text: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  custom_css: string | null;
  updated_by: string | null;
  updated_at: string;
}

/**
 * The public payload for a centre's website — theme + published pages only.
 * Never includes drafts or internal fields.
 */
export interface PublicSite {
  centre: {
    id: string;
    name: string;
    code: string;
  };
  theme: SiteTheme;
  pages: SitePage[];
}

export const SITE_FONT_OPTIONS = [
  { value: "ui-sans-serif", label: "Sans (system)" },
  { value: "ui-serif", label: "Serif (system)" },
  { value: "ui-monospace", label: "Monospace (system)" },
  { value: "Georgia, 'Times New Roman', serif", label: "Georgia" },
  { value: "'Segoe UI', Helvetica, Arial, sans-serif", label: "Segoe UI" },
] as const;

export const DEFAULT_SITE_THEME: Partial<SiteTheme> = {
  site_name: "",
  tagline: null,
  primary_color: "#4f46e5",
  accent_color: "#0ea5e9",
  heading_font: "ui-sans-serif",
  body_font: "ui-sans-serif",
  logo_url: null,
  favicon_url: null,
  hero_image_url: null,
  footer_text: null,
  contact_email: null,
  contact_phone: null,
  custom_css: null,
};