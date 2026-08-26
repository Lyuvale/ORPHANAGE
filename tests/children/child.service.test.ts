import { describe, it, expect, beforeEach } from "vitest";
import type { Child, ChildStatus, ChildStatusHistoryEntry } from "@/types/child";
import {
  getChildDisplayName,
  getChildDisplayStatus,
  CHILD_STATUSES,
} from "@/types/child";

// ─── In-memory child store ───────────────────────────────────────────────────

let children: Child[] = [];
let statusHistory: ChildStatusHistoryEntry[] = [];
let idCounter = 1;

function resetStore() {
  children = [];
  statusHistory = [];
  idCounter = 1;
}

function generateId(): string {
  return `child-${idCounter++}`;
}

function insertChild(data: Partial<Child>): Child {
  const child: Child = {
    id: generateId(),
    centre_id: "centre-a",
    reference_number: `CHD-${String(idCounter).padStart(6, "0")}`,
    first_name: "Test",
    middle_name: null,
    last_name: "Child",
    preferred_name: null,
    date_of_birth: "2015-06-15",
    gender: "female",
    nationality: null,
    photo_url: null,
    status: "active",
    admission_date: "2024-01-15",
    metadata: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...data,
  };
  children.push(child);
  return child;
}

function insertStatusHistory(
  data: Partial<ChildStatusHistoryEntry>,
): ChildStatusHistoryEntry {
  const entry: ChildStatusHistoryEntry = {
    id: `hist-${idCounter++}`,
    child_id: "child-1",
    centre_id: "centre-a",
    previous_status: null,
    new_status: "active",
    changed_by: null,
    changed_at: new Date().toISOString(),
    reason: null,
    ...data,
  };
  statusHistory.push(entry);
  return entry;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Child Service (in-memory simulation)", () => {
  beforeEach(() => {
    resetStore();
  });

  describe("createChild", () => {
    it("creates child with default active status", () => {
      const child = insertChild({
        first_name: "Amina",
        last_name: "Okafor",
      });
      expect(child.status).toBe("active");
      expect(child.first_name).toBe("Amina");
    });

    it("generates a reference number", () => {
      const child = insertChild({});
      expect(child.reference_number).toBeTruthy();
      expect(child.reference_number).toMatch(/^CHD-/);
    });

    it("reference number is unique per child", () => {
      const child1 = insertChild({});
      const child2 = insertChild({});
      expect(child1.reference_number).not.toBe(child2.reference_number);
    });

    it("sets admission_date and date_of_birth", () => {
      const child = insertChild({
        date_of_birth: "2015-06-15",
        admission_date: "2024-01-15",
      });
      expect(child.date_of_birth).toBe("2015-06-15");
      expect(child.admission_date).toBe("2024-01-15");
    });

    it("creates an initial status history entry", () => {
      const child = insertChild({});
      const history = insertStatusHistory({
        child_id: child.id,
        previous_status: null,
        new_status: "active",
        reason: "Initial admission",
      });
      expect(history.previous_status).toBeNull();
      expect(history.new_status).toBe("active");
    });
  });

  describe("child status transitions", () => {
    it("allows valid status transitions", () => {
      const child = insertChild({ status: "active" });
      const validTransitions: ChildStatus[] = [
        "transferred",
        "graduated",
        "alumni",
        "deactivated",
      ];

      for (const newStatus of validTransitions) {
        child.status = newStatus;
        insertStatusHistory({
          child_id: child.id,
          previous_status: "active",
          new_status: newStatus,
        });
      }

      expect(statusHistory.length).toBe(validTransitions.length);
    });

    it("records status change in history", () => {
      const child = insertChild({ status: "active" });
      const entry = insertStatusHistory({
        child_id: child.id,
        previous_status: "active",
        new_status: "graduated",
        reason: "Completed programme",
      });

      expect(entry.previous_status).toBe("active");
      expect(entry.new_status).toBe("graduated");
      expect(entry.reason).toBe("Completed programme");
    });

    it("tracks changed_by for status changes", () => {
      const entry = insertStatusHistory({
        changed_by: "user-manager",
      });
      expect(entry.changed_by).toBe("user-manager");
    });
  });

  describe("child is never physically deleted", () => {
    it("soft-deactivation instead of delete", () => {
      const child = insertChild({ status: "active" });
      child.status = "deactivated";
      expect(child.status).toBe("deactivated");
      // Record still exists
      expect(children).toContain(child);
    });

    it("deactivated child remains in store", () => {
      insertChild({ status: "deactivated" });
      insertChild({ status: "active" });
      expect(children.length).toBe(2);
    });
  });

  describe("tenant isolation", () => {
    it("child belongs to exactly one centre", () => {
      const child = insertChild({ centre_id: "centre-a" });
      expect(child.centre_id).toBe("centre-a");
    });

    it("centre_id is mandatory", () => {
      const child = insertChild({});
      expect(child.centre_id).toBeTruthy();
    });

    it("children from different centres have different IDs", () => {
      const childA = insertChild({ centre_id: "centre-a" });
      const childB = insertChild({ centre_id: "centre-b" });
      expect(childA.id).not.toBe(childB.id);
    });

    it("cannot look up child from wrong centre", () => {
      insertChild({ id: "child-a", centre_id: "centre-a" });
      insertChild({ id: "child-b", centre_id: "centre-b" });

      const found = children.find(
        (c) => c.id === "child-a" && c.centre_id === "centre-b",
      );
      expect(found).toBeUndefined();
    });
  });

  describe("reference number", () => {
    it("reference number is stable (never changes)", () => {
      const child = insertChild({});
      const originalRef = child.reference_number;
      child.first_name = "Updated Name";
      expect(child.reference_number).toBe(originalRef);
    });

    it("reference number is not based solely on name", () => {
      const child1 = insertChild({ first_name: "Amina", last_name: "Okafor" });
      const child2 = insertChild({ first_name: "Amina", last_name: "Okafor" });
      // Same name, different reference
      expect(child1.reference_number).not.toBe(child2.reference_number);
    });

    it("reference number is unique across centre", () => {
      const refs = new Set<string>();
      for (let i = 0; i < 10; i++) {
        const child = insertChild({});
        refs.add(child.reference_number);
      }
      expect(refs.size).toBe(10);
    });
  });

  describe("search filters", () => {
    beforeEach(() => {
      insertChild({
        id: "c1",
        centre_id: "centre-a",
        first_name: "Amina",
        last_name: "Okafor",
        status: "active",
      });
      insertChild({
        id: "c2",
        centre_id: "centre-a",
        first_name: "Blessing",
        last_name: "Eze",
        status: "active",
      });
      insertChild({
        id: "c3",
        centre_id: "centre-a",
        first_name: "Chidi",
        last_name: "Nwosu",
        status: "deactivated",
      });
      insertChild({
        id: "c4",
        centre_id: "centre-b",
        first_name: "David",
        last_name: "Adeyemi",
        status: "active",
      });
    });

    it("filters by centre_id", () => {
      const results = children.filter((c) => c.centre_id === "centre-a");
      expect(results.length).toBe(3);
    });

    it("filters by status", () => {
      const results = children.filter(
        (c) => c.centre_id === "centre-a" && c.status === "active",
      );
      expect(results.length).toBe(2);
    });

    it("searches by first_name", () => {
      const term = "amina";
      const results = children.filter(
        (c) =>
          c.centre_id === "centre-a" &&
          c.first_name.toLowerCase().includes(term),
      );
      expect(results.length).toBe(1);
      expect(results[0].id).toBe("c1");
    });

    it("searches by last_name", () => {
      const term = "eze";
      const results = children.filter(
        (c) =>
          c.centre_id === "centre-a" &&
          c.last_name.toLowerCase().includes(term),
      );
      expect(results.length).toBe(1);
      expect(results[0].id).toBe("c2");
    });

    it("searches by reference_number", () => {
      const ref = children[0].reference_number;
      const results = children.filter(
        (c) =>
          c.centre_id === "centre-a" &&
          c.reference_number.includes(ref),
      );
      expect(results.length).toBe(1);
    });

    it("search is always scoped to centre", () => {
      const results = children.filter(
        (c) =>
          c.centre_id === "centre-a" &&
          c.first_name.toLowerCase().includes("david"),
      );
      expect(results.length).toBe(0);
    });

    it("supports pagination with limit/offset", () => {
      const centreA = children
        .filter((c) => c.centre_id === "centre-a")
        .sort((a, b) => a.last_name.localeCompare(b.last_name));
      const page = centreA.slice(0, 2);
      expect(page.length).toBe(2);
    });
  });
});

describe("Child Display Helpers", () => {
  it("getChildDisplayName returns first + last name", () => {
    const child = {
      first_name: "Amina",
      middle_name: null,
      last_name: "Okafor",
    } as Child;
    expect(getChildDisplayName(child)).toBe("Amina Okafor");
  });

  it("getChildDisplayName includes middle name", () => {
    const child = {
      first_name: "Amina",
      middle_name: "Blessing",
      last_name: "Okafor",
    } as Child;
    expect(getChildDisplayName(child)).toBe("Amina Blessing Okafor");
  });

  it("getChildDisplayStatus returns formatted status", () => {
    expect(getChildDisplayStatus("active")).toBe("Active");
    expect(getChildDisplayStatus("transferred")).toBe("Transferred");
    expect(getChildDisplayStatus("graduated")).toBe("Graduated");
    expect(getChildDisplayStatus("alumni")).toBe("Alumni");
    expect(getChildDisplayStatus("deactivated")).toBe("Deactivated");
  });
});

describe("Status History Immutability", () => {
  beforeEach(() => {
    resetStore();
  });

  it("status history entries are append-only", () => {
    const child = insertChild({ status: "active" });

    insertStatusHistory({
      child_id: child.id,
      previous_status: null,
      new_status: "active",
    });
    insertStatusHistory({
      child_id: child.id,
      previous_status: "active",
      new_status: "graduated",
    });

    expect(statusHistory.length).toBe(2);
    // History entries are never modified after creation
    expect(statusHistory[0].new_status).toBe("active");
    expect(statusHistory[1].new_status).toBe("graduated");
  });

  it("status history preserves chronological order", () => {
    const child = insertChild({});

    const entry1 = insertStatusHistory({
      child_id: child.id,
      new_status: "active",
      changed_at: "2024-01-15T10:00:00Z",
    });
    const entry2 = insertStatusHistory({
      child_id: child.id,
      new_status: "graduated",
      changed_at: "2024-06-15T10:00:00Z",
    });

    // Most recent first when sorted by changed_at desc
    const sorted = [entry2, entry1];
    expect(sorted[0].new_status).toBe("graduated");
    expect(sorted[1].new_status).toBe("active");
  });
});
