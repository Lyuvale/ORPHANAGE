import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

import {
  ASSET_CATEGORIES,
  ASSET_STATUSES,
  ASSET_CONDITIONS,
  ASSET_LOCATIONS,
  SUPPORT_DOCUMENT_ENTITIES,
  getAssetCategoryDisplay,
  getAssetStatusDisplay,
  getAssetConditionDisplay,
  getAssetCostTypeDisplay,
  formatTsh,
} from "@/types/resources";
import {
  createAssetSchema,
  updateAssetSchema,
  createAssetCostSchema,
  assetStatusSchema,
  coerceCreate,
} from "@/lib/resources/resources.validation";
import { assetReportRows, toCsv } from "@/lib/resources/reports";
import { PERMISSIONS, ROLE_PERMISSIONS, type CentreRole } from "@/types/role";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260907000000_create_assets.sql"),
  "utf-8",
);
const lower = migration.toLowerCase();

describe("Assets (Resources & Support)", () => {
  describe("types", () => {
    it("adds ASSET as a supported document entity", () => {
      expect(SUPPORT_DOCUMENT_ENTITIES).toContain("ASSET");
    });

    it("defines the asset enumerations", () => {
      expect(ASSET_CATEGORIES).toContain("FURNITURE");
      expect(ASSET_STATUSES).toContain("DISPOSED");
      expect(ASSET_CONDITIONS).toContain("NEEDS_REPAIR");
      expect(ASSET_LOCATIONS).toContain("DORMITORY");
    });

    it("provides readable display helpers", () => {
      expect(getAssetCategoryDisplay("VEHICLE")).toBe("Vehicle");
      expect(getAssetStatusDisplay("IN_USE")).toBe("In Use");
      expect(getAssetConditionDisplay("NEEDS_REPAIR")).toBe("Needs Repair");
      expect(getAssetCostTypeDisplay("MAINTENANCE")).toBe("Maintenance");
    });
  });

  describe("validation", () => {
    it("accepts a valid asset create payload", () => {
      const parsed = createAssetSchema.safeParse({
        centre_id: "550e8400-e29b-41d4-a716-446655440000",
        asset_name: "Dining tables",
        asset_category: "FURNITURE",
        quantity: 20,
        source_unknown: true,
        purchase_cost: 2000000,
      });
      expect(parsed.success).toBe(true);
    });

    it("rejects an invalid category", () => {
      const parsed = createAssetSchema.safeParse({
        centre_id: "550e8400-e29b-41d4-a716-446655440000",
        asset_name: "X",
        asset_category: "TOOLS",
      });
      expect(parsed.success).toBe(false);
    });

    it("rejects a negative purchase cost", () => {
      const parsed = createAssetSchema.safeParse({
        centre_id: "550e8400-e29b-41d4-a716-446655440000",
        asset_name: "X",
        asset_category: "OTHER",
        purchase_cost: -5,
      });
      expect(parsed.success).toBe(false);
    });
  });

  describe("coerceCreate", () => {
    it("coerces empty asset strings to null for optional fields", () => {
      const out = coerceCreate({
        asset_name: "Table",
        purchase_cost: "",
        location: "",
        asset_id: "",
        cost_date: "",
      });
      expect(out.purchase_cost).toBeNull();
      expect(out.location).toBeNull();
      expect(out.asset_id).toBeNull();
      expect(out.cost_date).toBeNull();
    });

    it("accepts an unknown purchase cost (null) as valid", () => {
      const parsed = createAssetSchema.safeParse({
        centre_id: "550e8400-e29b-41d4-a716-446655440000",
        asset_name: "Table",
        asset_category: "FURNITURE",
        purchase_cost: null,
        source_unknown: true,
      });
      expect(parsed.success).toBe(true);
    });
  });

  describe("reports", () => {
    it("builds asset rows with category/status display and computed total", () => {
      const rows = assetReportRows([
        {
          asset_name: "Tables",
          asset_id: "AST-001",
          asset_category: "FURNITURE",
          quantity: 20,
          location: "DINING_ROOM",
          asset_status: "IN_USE",
          asset_condition: "GOOD",
          source: { source_name: "Donation" },
          source_unknown: false,
          purchase_cost: 2000000,
          total_cost: 2100000,
        },
      ]);
      expect(rows[0].asset).toBe("Tables");
      expect(rows[0].location).toBe("Dining Room");
      expect(rows[0].status).toBe("In Use");
      expect(rows[0].source).toBe("Donation");
      expect(rows[0].purchase_cost).toBe("TSh 2,000,000");
      expect(rows[0].total_cost).toBe("TSh 2,100,000");
    });

    it("labels an unknown source and unknown purchase cost", () => {
      const rows = assetReportRows([
        {
          asset_name: "Table",
          asset_category: "FURNITURE",
          quantity: 1,
          asset_status: "ACTIVE",
          asset_condition: "GOOD",
          source: null,
          source_unknown: true,
          purchase_cost: null,
          total_cost: 0,
        },
      ]);
      expect(rows[0].source).toBe("Existing Centre Asset / Unknown");
      expect(rows[0].purchase_cost).toBe("Unknown");
    });

    it("emits asset report rows as CSV", () => {
      const rows = assetReportRows([
        {
          asset_name: "Table",
          asset_category: "FURNITURE",
          quantity: 1,
          asset_status: "ACTIVE",
          asset_condition: "GOOD",
          source: null,
          source_unknown: true,
          purchase_cost: null,
          total_cost: 0,
        },
      ]);
      const columns = Object.keys(rows[0]).map((k) => ({ key: k, label: k }));
      const csv = toCsv(columns, rows);
      expect(csv).toContain("Existing Centre Asset / Unknown");
    });
  });

  describe("migration", () => {
    it("adds ASSET value to the existing document entity enum", () => {
      expect(lower).toContain("alter type support_document_entity add value if not exists 'asset'");
    });

    it("creates the three asset enums", () => {
      expect(lower).toContain("create type asset_category as enum");
      expect(lower).toContain("create type asset_status as enum");
      expect(lower).toContain("create type asset_condition as enum");
    });

    it("creates the asset tables", () => {
      for (const t of ["support_assets", "support_asset_costs", "support_asset_history"]) {
        expect(lower).toContain(`create table ${t}`);
      }
    });

    it("links assets to existing sources/funds/expenses/benefits (never duplicated)", () => {
      expect(lower).toContain("references support_sources(id) on delete set null");
      expect(lower).toContain("references support_expenses(id) on delete set null");
      expect(lower).toContain("references support_benefits(id) on delete set null");
      expect(lower).toContain("references support_assets(id) on delete cascade");
    });

    it("enables RLS and deny-by-default on all asset tables", () => {
      for (const prefix of ["support_asset", "support_asset_cost", "support_asset_history"]) {
        expect(lower).toContain(`${prefix}_deny_auth_insert`);
        expect(lower).toContain(`${prefix}_deny_auth_update`);
        expect(lower).toContain(`${prefix}_deny_auth_delete`);
      }
    });

    it("scopes SELECT by current_centre_id", () => {
      expect(lower.split("public.current_centre_id()").length).toBeGreaterThan(3);
      expect(lower).toContain("support_asset_select_centre");
    });

    it("adds the five granular asset permissions", () => {
      for (const code of [
        "('resources', 'assets.view',",
        "('resources', 'assets.manage',",
        "('resources', 'assets.costs',",
        "('resources', 'assets.status',",
        "('resources', 'assets.dispose',",
      ]) {
        expect(lower).toContain(code);
      }
    });

    it("grants asset permissions to manager & bursar, view to worker & records", () => {
      expect(migration).toContain("mgr, id FROM permissions WHERE (module = 'resources' AND action LIKE 'assets.%')");
      expect(migration).toContain("ab, id FROM permissions WHERE (module = 'resources' AND action LIKE 'assets.%')");
      expect(migration).toContain("sw, id FROM permissions WHERE (module = 'resources' AND action = 'assets.view')");
      expect(migration).toContain("ro, id FROM permissions WHERE (module = 'resources' AND action = 'assets.view')");
    });
  });

  describe("permissions", () => {
    it("defines the asset permission constants", () => {
      expect(PERMISSIONS.RESOURCES_ASSETS_VIEW).toBe("resources.assets.view");
      expect(PERMISSIONS.RESOURCES_ASSETS_MANAGE).toBe("resources.assets.manage");
      expect(PERMISSIONS.RESOURCES_ASSETS_COSTS).toBe("resources.assets.costs");
      expect(PERMISSIONS.RESOURCES_ASSETS_STATUS).toBe("resources.assets.status");
      expect(PERMISSIONS.RESOURCES_ASSETS_DISPOSE).toBe("resources.assets.dispose");
    });

    it("grants full asset permission set to the bursar; view-only to the manager", () => {
      const bursar = ROLE_PERMISSIONS.ACCOUNTANT_BURSAR;
      expect(bursar).toContain("resources.assets.view");
      expect(bursar).toContain("resources.assets.manage");
      expect(bursar).toContain("resources.assets.costs");
      expect(bursar).toContain("resources.assets.status");
      expect(bursar).toContain("resources.assets.dispose");

      const manager = ROLE_PERMISSIONS.CENTRE_MANAGER;
      expect(manager).toContain("resources.assets.view");
      expect(manager).not.toContain("resources.assets.manage");
      expect(manager).not.toContain("resources.assets.costs");
      expect(manager).not.toContain("resources.assets.status");
      expect(manager).not.toContain("resources.assets.dispose");
    });

    it("grants asset view-only to the records officer; none to social worker", () => {
      expect(ROLE_PERMISSIONS.SOCIAL_WORKER.some((p) => p.startsWith("resources."))).toBe(false);
      expect(ROLE_PERMISSIONS.RECORDS_OFFICER).toContain("resources.assets.view");
      expect(ROLE_PERMISSIONS.CAREGIVER).not.toContain("resources.assets.view");
    });
  });

  describe("format helper", () => {
    it("formats asset costs as whole TZS", () => {
      expect(formatTsh(2000000)).toBe("TSh 2,000,000");
    });
  });
});
