"use client";

import { useState } from "react";
import type { SiteTheme } from "@/types/centre-site";
import { SITE_FONT_OPTIONS } from "@/types/centre-site";
import ImageUploader from "./image-uploader";

const inputCls =
  "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm";
const labelCls = "block text-sm font-medium text-gray-700";

export default function ThemePanel({
  initialTheme,
  canManage,
}: {
  initialTheme: SiteTheme;
  canManage: boolean;
}) {
  const [form, setForm] = useState<Partial<SiteTheme>>(initialTheme);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const set = (key: keyof SiteTheme, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/centre-site/theme", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        const detail = json.details ?? json.error ?? "Failed to save appearance";
        throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
      }
      setForm(json.data);
      setMessage({ ok: true, text: "Appearance saved." });
    } catch (e) {
      setMessage({
        ok: false,
        text: e instanceof Error ? e.message : "Failed to save appearance",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6 max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Appearance</h2>
        <p className="text-sm text-gray-500">
          Colours, fonts, logo and footer used across every public page.
        </p>
      </div>

      {message && (
        <p
          className={`rounded-md border px-3 py-2 text-sm ${
            message.ok
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
          role={message.ok ? "status" : "alert"}
        >
          {message.text}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor="site_name">Site name</label>
          <input id="site_name" disabled={!canManage} className={inputCls} value={form.site_name ?? ""}
            onChange={(e) => set("site_name", e.target.value)} placeholder="Sunrise Children's Home" />
          <p className="mt-1 text-xs text-gray-400">Leave empty to use the centre name.</p>
        </div>
        <div>
          <label className={labelCls} htmlFor="tagline">Tagline</label>
          <input id="tagline" disabled={!canManage} className={inputCls} value={form.tagline ?? ""}
            onChange={(e) => set("tagline", e.target.value)} placeholder="A safe home for every child" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor="primary_color">Primary colour</label>
          <div className="mt-1 flex items-center gap-2">
            <input id="primary_color" disabled={!canManage} type="color" value={form.primary_color ?? "#4f46e5"}
              onChange={(e) => set("primary_color", e.target.value)} className="h-9 w-12 rounded border border-gray-300" />
            <input disabled={!canManage} className={inputCls} value={form.primary_color ?? ""}
              onChange={(e) => set("primary_color", e.target.value)} />
          </div>
        </div>
        <div>
          <label className={labelCls} htmlFor="accent_color">Accent colour</label>
          <div className="mt-1 flex items-center gap-2">
            <input id="accent_color" disabled={!canManage} type="color" value={form.accent_color ?? "#0ea5e9"}
              onChange={(e) => set("accent_color", e.target.value)} className="h-9 w-12 rounded border border-gray-300" />
            <input disabled={!canManage} className={inputCls} value={form.accent_color ?? ""}
              onChange={(e) => set("accent_color", e.target.value)} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor="heading_font">Heading font</label>
          <select id="heading_font" disabled={!canManage} className={inputCls} value={form.heading_font}
            onChange={(e) => set("heading_font", e.target.value)}>
            {SITE_FONT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="body_font">Body font</label>
          <select id="body_font" disabled={!canManage} className={inputCls} value={form.body_font}
            onChange={(e) => set("body_font", e.target.value)}>
            {SITE_FONT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          {canManage ? (
            <ImageUploader value={form.logo_url ?? ""} onChange={(url) => set("logo_url", url)} label="Logo" />
          ) : (
            <>
              <label className={labelCls} htmlFor="logo_url">Logo URL</label>
              <input id="logo_url" className={inputCls} value={form.logo_url ?? ""} readOnly />
            </>
          )}
        </div>
        <div>
          {canManage ? (
            <ImageUploader value={form.favicon_url ?? ""} onChange={(url) => set("favicon_url", url)} label="Favicon" />
          ) : (
            <>
              <label className={labelCls} htmlFor="favicon_url">Favicon URL</label>
              <input id="favicon_url" className={inputCls} value={form.favicon_url ?? ""} readOnly />
            </>
          )}
        </div>
      </div>

      <div>
        {canManage ? (
          <ImageUploader value={form.hero_image_url ?? ""} onChange={(url) => set("hero_image_url", url)} label="Hero image URL (optional)" />
        ) : (
          <>
            <label className={labelCls} htmlFor="hero_image_url">Hero image URL (optional)</label>
            <input id="hero_image_url" className={inputCls} value={form.hero_image_url ?? ""} readOnly />
          </>
        )}
      </div>

      <div>
        <label className={labelCls} htmlFor="footer_text">Footer text</label>
        <textarea id="footer_text" disabled={!canManage} className={inputCls} rows={2} value={form.footer_text ?? ""}
          onChange={(e) => set("footer_text", e.target.value)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor="contact_email">Contact email</label>
          <input id="contact_email" disabled={!canManage} className={inputCls} value={form.contact_email ?? ""}
            onChange={(e) => set("contact_email", e.target.value)} placeholder="info@centre.org" />
        </div>
        <div>
          <label className={labelCls} htmlFor="contact_phone">Contact phone</label>
          <input id="contact_phone" disabled={!canManage} className={inputCls} value={form.contact_phone ?? ""}
            onChange={(e) => set("contact_phone", e.target.value)} />
        </div>
      </div>

      <div>
        <label className={labelCls} htmlFor="custom_css">Custom CSS (advanced)</label>
        <textarea id="custom_css" disabled={!canManage} className={`${inputCls} font-mono`} rows={6}
          value={form.custom_css ?? ""}
          onChange={(e) => set("custom_css", e.target.value)}
          placeholder={"/* Optional extra styles for your public site */\n"} />
      </div>

      {canManage && (
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save appearance"}
        </button>
      )}
    </div>
  );
}