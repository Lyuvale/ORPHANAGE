import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseMoneyInput, formatValidationDetails } from "@/lib/money";

function src(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf-8");
}

describe("parseMoneyInput (TZS entry)", () => {
  it("accepts plain numbers", () => {
    expect(parseMoneyInput("250000")).toEqual({ ok: true, value: 250000 });
  });

  it("accepts thousands separators and spaces", () => {
    expect(parseMoneyInput("1,000,000")).toEqual({ ok: true, value: 1000000 });
    expect(parseMoneyInput("1 000 000")).toEqual({ ok: true, value: 1000000 });
  });

  it("rejects empty, non-numeric and negative input with clear messages", () => {
    expect(parseMoneyInput("").ok).toBe(false);
    expect(parseMoneyInput("abc").ok).toBe(false);
    expect(parseMoneyInput("-5").ok).toBe(false);
  });

  it("formats field errors readably", () => {
    expect(formatValidationDetails({ amount: ["Amount must be a number"] })).toContain("amount");
    expect(formatValidationDetails(null)).toBeNull();
  });

  it("unwraps zod flattened errors (no [object Object])", () => {
    const flat = {
      formErrors: [],
      fieldErrors: { centre_id: ["Invalid centre ID"], amount: ["Required"] },
    };
    const msg = formatValidationDetails(flat);
    expect(msg).toContain("centre_id");
    expect(msg).toContain("amount");
    expect(msg).not.toContain("[object Object]");
  });

  it("creation routes default missing centre_id to the own centre", () => {
    for (const rel of [
      "src/app/api/resources/sources/route.ts",
      "src/app/api/resources/funds/route.ts",
      "src/app/api/resources/expenses/route.ts",
      "src/app/api/resources/assets/route.ts",
    ]) {
      expect(src(rel)).toContain("if (!body.centre_id) body.centre_id = ctx.centre.id;");
    }
  });
});

describe("Resource creation forms use safe amount parsing", () => {
  for (const rel of [
    "src/app/(dashboard)/resources/sources/new/page.tsx",
    "src/app/(dashboard)/resources/funds/new/page.tsx",
    "src/app/(dashboard)/resources/expenses/new/page.tsx",
    "src/app/(dashboard)/resources/assets/new/page.tsx",
  ]) {
    it(`${rel} parses amounts and surfaces field errors`, () => {
      const code = src(rel);
      expect(code).toContain("parseMoneyInput");
      expect(code).toContain("formatValidationDetails");
      expect(code).not.toContain("Number(amount)");
      expect(code).not.toContain("Number(amountAllocated)");
    });
  }
});
