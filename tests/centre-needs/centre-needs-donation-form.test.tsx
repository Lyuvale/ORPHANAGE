import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import NeedDonateForm from "@/components/centre-site/need-donate-form";
import NeedsShowcase from "@/components/centre-site/needs-showcase";
import type { PublicCentreNeed } from "@/types/centre-need";

const NEED_ID = "11111111-1111-1111-1111-111111111111";

const NEED: PublicCentreNeed = {
  id: NEED_ID,
  title: "Uniforms for 20 students",
  description: "School uniforms for the new intake.",
  image_url: null,
  target_amount: 1_000_000,
  status: "active",
  sort_order: 0,
  created_at: "2026-11-01T00:00:00.000Z",
  raised_amount: 400_000,
  remaining_amount: 600_000,
  percent: 40,
  is_completed: false,
};

describe("Public donation form (SSR smoke)", () => {
  const html = renderToString(
    createElement(NeedDonateForm, {
      centreCode: "MASPA",
      needId: NEED_ID,
    }),
  );

  it("renders Amount (TZS) with quick-pick chips", () => {
    expect(html).toContain("Amount (TZS)");
    for (const quick of ["10,000", "25,000", "50,000", "100,000"]) {
      expect(html).toContain(quick);
    }
  });

  it("renders Jina la Muamala (Transaction Number)", () => {
    expect(html).toContain("Jina la Muamala");
  });

  it("renders Jina la Mchangiaji", () => {
    expect(html).toContain("Jina la Mchangiaji");
  });

  it("renders Namba ya Simu ya Mchangiaji", () => {
    expect(html).toContain("Namba ya Simu ya Mchangiaji");
  });

  it("renders the Swahili helper text", () => {
    expect(html).toContain(
      "Mchango wako utaonekana baada ya mhasibu wa kituo kuthibitisha jina la muamala.",
    );
  });

  it("renders a submit button that does not hard-reload the page", () => {
    expect(html).toContain("Tuma Mchango");
    expect(html).toContain('type="submit"');
  });
});

describe("Needs showcase (SSR smoke)", () => {
  const html = renderToString(
    createElement(NeedsShowcase, {
      needs: [NEED],
      centreCode: "MASPA",
      primaryColor: "#059669",
      headingFont: "ui-sans-serif",
    }),
  );

  it("renders the Changia Sasa section and heading", () => {
    expect(html).toContain("Changia Sasa");
    expect(html).toContain("Changia kile kinachohitajika");
  });

  it("renders the need card with progress", () => {
    expect(html).toContain("Uniforms for 20 students");
    expect(html).toContain('role="progressbar"');
    expect(html).toContain("aria-valuenow=\"40\"");
  });

  it("renders a working Changia sasa toggle button", () => {
    expect(html).toContain("Changia sasa");
    expect(html).toContain("aria-expanded=\"false\"");
  });
});
