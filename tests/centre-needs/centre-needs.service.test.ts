import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { computeNeedProgress } from "@/types/centre-need";
import { listPublicNeeds } from "@/lib/centre-site/centre-needs.service";

const service = readFileSync(
  join(process.cwd(), "src/lib/centre-site/centre-needs.service.ts"),
  "utf-8",
);

describe("Centre Needs — progress computation", () => {
  it("returns zero progress when nothing has been raised", () => {
    const progress = computeNeedProgress("need-1", 1000, 0);
    expect(progress.raised_amount).toBe(0);
    expect(progress.remaining_amount).toBe(1000);
    expect(progress.percent).toBe(0);
    expect(progress.is_completed).toBe(false);
  });

  it("computes a partial percentage", () => {
    const progress = computeNeedProgress("need-1", 1000, 250);
    expect(progress.raised_amount).toBe(250);
    expect(progress.remaining_amount).toBe(750);
    expect(progress.percent).toBe(25);
    expect(progress.is_completed).toBe(false);
  });

  it("caps percentage at 100 and never reports negative remaining", () => {
    const progress = computeNeedProgress("need-1", 1000, 1500);
    expect(progress.raised_amount).toBe(1500);
    expect(progress.remaining_amount).toBe(0);
    expect(progress.percent).toBe(100);
    expect(progress.is_completed).toBe(true);
  });

  it("marks a need completed exactly at the target", () => {
    const progress = computeNeedProgress("need-1", 1000, 1000);
    expect(progress.remaining_amount).toBe(0);
    expect(progress.percent).toBe(100);
    expect(progress.is_completed).toBe(true);
  });

  it("rounds money to 2 decimals and percent to 2 decimals", () => {
    const progress = computeNeedProgress("need-1", 1000, 333.335);
    expect(progress.raised_amount).toBe(333.34);
    expect(progress.percent).toBe(33.33);
  });

  it("handles a zero target defensively", () => {
    const progress = computeNeedProgress("need-1", 0, 100);
    expect(progress.percent).toBe(0);
    expect(progress.is_completed).toBe(false);
  });
});

describe("Centre Needs — service tenant scoping (source checks)", () => {
  it("scopes every manager read/write by centre_id", () => {
    expect(service).toContain('.eq("centre_id", centreId)');
    expect(service).toContain('.eq("id", needId)');
  });

  it("only exposes public rows on listPublicNeeds", () => {
    expect(service).toContain('.eq("is_public", true)');
    expect(service).toContain('.neq("status", "archived")');
  });

  it("selects an explicit public column list (never a wildcard)", () => {
    expect(service).toContain("PUBLIC_NEED_COLUMNS");
    expect(service).toContain(".select(PUBLIC_NEED_COLUMNS)");
  });

  it("never reads child, guardian, staff, case or payment-ledger tables", () => {
    expect(service).not.toContain('.from("children")');
    expect(service).not.toContain('.from("guardians")');
    expect(service).not.toContain('.from("staff_profiles")');
    expect(service).not.toContain('.from("cases")');
    expect(service).not.toContain('.from("payment_transactions")');
  });

  it("computes raised totals from centre_need_contributions", () => {
    expect(service).toContain('.from(CONTRIBUTIONS_TABLE)');
    expect(service).toContain('.select("need_id, amount")');
  });
});

describe("Centre Needs — listPublicNeeds mapping", () => {
  function makeQuery(
    result: { data: unknown; error: null },
    calls: Array<{ method: string; args: unknown[] }>,
  ) {
    const query: Record<string, unknown> = {};
    for (const method of ["select", "eq", "neq", "order", "in"]) {
      query[method] = (...args: unknown[]) => {
        calls.push({ method, args });
        return query;
      };
    }
    query.then = (
      resolve: (value: unknown) => unknown,
      reject: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(resolve, reject);
    return query;
  }

  it("returns only public fields with computed progress", async () => {
    const calls: Array<{ method: string; args: unknown[] }> = [];

    const admin = {
      from(table: string) {
        if (table === "centre_needs") {
          return makeQuery(
            {
              data: [
                {
                  id: "n1",
                  title: "Uniforms",
                  description: "School uniforms",
                  image_url: null,
                  target_amount: 1000,
                  status: "active",
                  sort_order: 0,
                  created_at: "2026-11-09T00:00:00.000Z",
                  // Internal fields that must NOT reach the public mapping:
                  centre_id: "centre-a",
                  created_by: "user-1",
                  updated_by: "user-1",
                  is_public: true,
                },
                {
                  id: "n2",
                  title: "Beds",
                  description: null,
                  image_url: null,
                  target_amount: 1000,
                  status: "completed",
                  sort_order: 1,
                  created_at: "2026-11-09T00:00:00.000Z",
                },
              ],
              error: null,
            },
            calls,
          );
        }
        return makeQuery(
          {
            data: [
              { need_id: "n1", amount: 250 },
              { need_id: "n2", amount: 1000 },
              // A contribution row with internal fields must only be summed.
              { need_id: "n2", amount: 0.5, note: "secret", payment_transaction_id: "p1", source: "ONLINE" },
            ],
            error: null,
          },
          calls,
        );
      },
    };

    const needs = await listPublicNeeds(admin as never, "centre-a");
    const uniforms = needs.find((n) => n.id === "n1");
    const beds = needs.find((n) => n.id === "n2");

    expect(uniforms).toMatchObject({
      raised_amount: 250,
      remaining_amount: 750,
      percent: 25,
      is_completed: false,
    });
    expect(beds).toMatchObject({
      raised_amount: 1000.5,
      remaining_amount: 0,
      percent: 100,
      is_completed: true,
    });

    for (const need of needs) {
      expect(Object.keys(need).sort()).toEqual(
        [
          "created_at",
          "description",
          "id",
          "image_url",
          "is_completed",
          "percent",
          "raised_amount",
          "remaining_amount",
          "sort_order",
          "status",
          "target_amount",
          "title",
        ].sort(),
      );
      expect(need).not.toHaveProperty("centre_id");
      expect(need).not.toHaveProperty("created_by");
      expect(need).not.toHaveProperty("updated_by");
      expect(need).not.toHaveProperty("note");
      expect(need).not.toHaveProperty("payment_transaction_id");
      expect(need).not.toHaveProperty("source");
    }

    const methods = calls.map((c) => `${c.method}:${String(c.args[0])}`);
    expect(methods).toContain("eq:centre_id");
    expect(methods).toContain("eq:is_public");
    expect(methods).toContain("neq:status");
    expect(methods).toContain("in:need_id");
  });
});
