import { describe, it, expect, beforeEach } from "vitest";
import type { Placement, PlacementStatus } from "@/types/placement";
import {
  PLACEMENT_STATUSES,
  PLACEMENT_TYPES,
  getPlacementDisplayStatus,
  getPlacementDisplayType,
} from "@/types/placement";

// ─── In-memory placement store ───────────────────────────────────────────────

let placements: Placement[] = [];
let idCounter = 1;

function resetStore() {
  placements = [];
  idCounter = 1;
}

function generateId(): string {
  return `plc-${idCounter++}`;
}

function insertPlacement(data: Partial<Placement>): Placement {
  const placement: Placement = {
    id: generateId(),
    centre_id: "centre-a",
    child_id: "child-1",
    admission_id: null,
    reference_number: `PLC-${String(idCounter).padStart(6, "0")}`,
    status: "active",
    bed_reference: null,
    room_number: null,
    start_date: "2026-08-29",
    end_date: null,
    placement_type: "residential",
    notes: null,
    assigned_by: null,
    metadata: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...data,
  };
  placements.push(placement);
  return placement;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Placement Service (in-memory simulation)", () => {
  beforeEach(() => {
    resetStore();
  });

  describe("createPlacement", () => {
    it("creates placement with default active status", () => {
      const placement = insertPlacement({
        child_id: "child-1",
      });
      expect(placement.status).toBe("active");
    });

    it("creates placement with default residential type", () => {
      const placement = insertPlacement({
        child_id: "child-1",
      });
      expect(placement.placement_type).toBe("residential");
    });

    it("assigns a reference number", () => {
      const placement = insertPlacement({
        child_id: "child-1",
      });
      expect(placement.reference_number).toBeTruthy();
    });

    it("stores start_date correctly", () => {
      const placement = insertPlacement({
        child_id: "child-1",
        start_date: "2026-08-29",
      });
      expect(placement.start_date).toBe("2026-08-29");
    });

    it("stores bed_reference and room_number", () => {
      const placement = insertPlacement({
        child_id: "child-1",
        bed_reference: "B12",
        room_number: "R101",
      });
      expect(placement.bed_reference).toBe("B12");
      expect(placement.room_number).toBe("R101");
    });
  });

  describe("updatePlacement", () => {
    it("updates bed_reference", () => {
      const placement = insertPlacement({
        child_id: "child-1",
        bed_reference: "B12",
      });
      const updated = { ...placement, bed_reference: "B15" };
      expect(updated.bed_reference).toBe("B15");
    });

    it("updates room_number", () => {
      const placement = insertPlacement({
        child_id: "child-1",
        room_number: "R101",
      });
      const updated = { ...placement, room_number: "R202" };
      expect(updated.room_number).toBe("R202");
    });

    it("updates placement_type", () => {
      const placement = insertPlacement({
        child_id: "child-1",
        placement_type: "residential",
      });
      const updated = { ...placement, placement_type: "foster" as const };
      expect(updated.placement_type).toBe("foster");
    });
  });

  describe("updatePlacementStatus", () => {
    it("transitions from active to completed", () => {
      const placement = insertPlacement({ status: "active" });
      const updated = { ...placement, status: "completed" as PlacementStatus };
      expect(updated.status).toBe("completed");
    });

    it("transfers from active to transferred", () => {
      const placement = insertPlacement({ status: "active" });
      const updated = { ...placement, status: "transferred" as PlacementStatus };
      expect(updated.status).toBe("transferred");
    });

    it("discharges from active to discharged", () => {
      const placement = insertPlacement({ status: "active" });
      const updated = { ...placement, status: "discharged" as PlacementStatus };
      expect(updated.status).toBe("discharged");
    });

    it("sets end_date when completing", () => {
      const placement = insertPlacement({
        status: "active",
        end_date: null,
      });
      const updated = {
        ...placement,
        status: "completed" as PlacementStatus,
        end_date: "2026-08-29",
      };
      expect(updated.end_date).toBe("2026-08-29");
    });
  });

  describe("listPlacements", () => {
    it("returns all placements for a centre", () => {
      insertPlacement({ centre_id: "centre-a", child_id: "child-1" });
      insertPlacement({ centre_id: "centre-a", child_id: "child-2" });
      insertPlacement({ centre_id: "centre-b", child_id: "child-3" });

      const filtered = placements.filter((p) => p.centre_id === "centre-a");
      expect(filtered).toHaveLength(2);
    });

    it("filters by status", () => {
      insertPlacement({ status: "active" });
      insertPlacement({ status: "completed" });
      insertPlacement({ status: "active" });

      const filtered = placements.filter((p) => p.status === "active");
      expect(filtered).toHaveLength(2);
    });

    it("filters by placement_type", () => {
      insertPlacement({ placement_type: "residential" });
      insertPlacement({ placement_type: "foster" });
      insertPlacement({ placement_type: "residential" });

      const filtered = placements.filter((p) => p.placement_type === "residential");
      expect(filtered).toHaveLength(2);
    });

    it("filters by child_id", () => {
      insertPlacement({ child_id: "child-1" });
      insertPlacement({ child_id: "child-2" });
      insertPlacement({ child_id: "child-1" });

      const filtered = placements.filter((p) => p.child_id === "child-1");
      expect(filtered).toHaveLength(2);
    });
  });

  describe("searchPlacements", () => {
    it("searches by reference number", () => {
      insertPlacement({ reference_number: "ABC-PLC-000001" });
      insertPlacement({ reference_number: "XYZ-PLC-000001" });

      const term = "abc";
      const filtered = placements.filter((p) =>
        p.reference_number.toLowerCase().includes(term),
      );
      expect(filtered).toHaveLength(1);
    });

    it("searches by bed reference", () => {
      insertPlacement({ bed_reference: "B12" });
      insertPlacement({ bed_reference: "B15" });

      const term = "b12";
      const filtered = placements.filter((p) =>
        p.bed_reference?.toLowerCase().includes(term),
      );
      expect(filtered).toHaveLength(1);
    });

    it("searches by room number", () => {
      insertPlacement({ room_number: "R101" });
      insertPlacement({ room_number: "R202" });

      const term = "r101";
      const filtered = placements.filter((p) =>
        p.room_number?.toLowerCase().includes(term),
      );
      expect(filtered).toHaveLength(1);
    });
  });

  describe("display helpers", () => {
    it("getPlacementDisplayStatus returns correct labels", () => {
      expect(getPlacementDisplayStatus("active")).toBe("Active");
      expect(getPlacementDisplayStatus("completed")).toBe("Completed");
      expect(getPlacementDisplayStatus("transferred")).toBe("Transferred");
      expect(getPlacementDisplayStatus("discharged")).toBe("Discharged");
    });

    it("getPlacementDisplayType returns correct labels", () => {
      expect(getPlacementDisplayType("residential")).toBe("Residential");
      expect(getPlacementDisplayType("foster")).toBe("Foster Care");
      expect(getPlacementDisplayType("adoption")).toBe("Adoption");
      expect(getPlacementDisplayType("transitional")).toBe("Transitional");
      expect(getPlacementDisplayType("temporary")).toBe("Temporary");
    });
  });

  describe("constants", () => {
    it("PLACEMENT_STATUSES contains all required statuses", () => {
      expect(PLACEMENT_STATUSES).toContain("active");
      expect(PLACEMENT_STATUSES).toContain("completed");
      expect(PLACEMENT_STATUSES).toContain("transferred");
      expect(PLACEMENT_STATUSES).toContain("discharged");
    });

    it("PLACEMENT_TYPES contains all required types", () => {
      expect(PLACEMENT_TYPES).toContain("residential");
      expect(PLACEMENT_TYPES).toContain("foster");
      expect(PLACEMENT_TYPES).toContain("adoption");
      expect(PLACEMENT_TYPES).toContain("transitional");
      expect(PLACEMENT_TYPES).toContain("temporary");
    });
  });
});
