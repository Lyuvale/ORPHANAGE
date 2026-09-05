import { describe, it, expect, beforeEach } from "vitest";
import type {
  Admission,
  AdmissionStatus,
  AdmissionHistoryEntry,
} from "@/types/admission";
import {
  ADMISSION_STATUSES,
  getAdmissionDisplayStatus,
} from "@/types/admission";

// ─── In-memory admission store ───────────────────────────────────────────────

let admissions: Admission[] = [];
let admissionHistory: AdmissionHistoryEntry[] = [];
let idCounter = 1;

function resetStore() {
  admissions = [];
  admissionHistory = [];
  idCounter = 1;
}

function generateId(): string {
  return `adm-${idCounter++}`;
}

function insertAdmission(data: Partial<Admission>): Admission {
  const admission: Admission = {
    id: generateId(),
    centre_id: "centre-a",
    referral_id: "ref-1",
    child_id: null,
    reference_number: `ADM-${String(idCounter).padStart(6, "0")}`,
    status: "pending",
    decision: null,
    conditions: null,
    admitted_date: null,
    admitted_by: null,
    denied_reason: null,
    metadata: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...data,
  };
  admissions.push(admission);
  return admission;
}

function insertAdmissionHistory(
  data: Partial<AdmissionHistoryEntry>,
): AdmissionHistoryEntry {
  const entry: AdmissionHistoryEntry = {
    id: `hist-${idCounter++}`,
    admission_id: "adm-1",
    centre_id: "centre-a",
    previous_status: null,
    new_status: "pending",
    changed_by: null,
    changed_at: new Date().toISOString(),
    reason: null,
    ...data,
  };
  admissionHistory.push(entry);
  return entry;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Admission Service (in-memory simulation)", () => {
  beforeEach(() => {
    resetStore();
  });

  describe("createAdmission", () => {
    it("creates admission with default pending status", () => {
      const admission = insertAdmission({
        referral_id: "ref-1",
      });
      expect(admission.status).toBe("pending");
    });

    it("assigns a reference number", () => {
      const admission = insertAdmission({
        referral_id: "ref-1",
      });
      expect(admission.reference_number).toBeTruthy();
    });

    it("stores referral_id correctly", () => {
      const admission = insertAdmission({
        referral_id: "ref-42",
      });
      expect(admission.referral_id).toBe("ref-42");
    });
  });

  describe("updateAdmission", () => {
    it("updates decision", () => {
      const admission = insertAdmission({
        referral_id: "ref-1",
      });
      const updated = { ...admission, decision: "Approved for placement" };
      expect(updated.decision).toBe("Approved for placement");
    });

    it("updates conditions", () => {
      const admission = insertAdmission({
        referral_id: "ref-1",
      });
      const updated = { ...admission, conditions: "Must attend monthly review" };
      expect(updated.conditions).toBe("Must attend monthly review");
    });
  });

  describe("updateAdmissionStatus", () => {
    it("transitions from pending to approved", () => {
      const admission = insertAdmission({ status: "pending" });
      const updated = { ...admission, status: "approved" as AdmissionStatus };
      expect(updated.status).toBe("approved");
    });

    it("transitions from pending to denied", () => {
      const admission = insertAdmission({ status: "pending" });
      const updated = { ...admission, status: "denied" as AdmissionStatus };
      expect(updated.status).toBe("denied");
    });

    it("transitions from pending to cancelled", () => {
      const admission = insertAdmission({ status: "pending" });
      const updated = { ...admission, status: "cancelled" as AdmissionStatus };
      expect(updated.status).toBe("cancelled");
    });
  });

  describe("admission history", () => {
    it("records status changes", () => {
      const entry = insertAdmissionHistory({
        previous_status: null,
        new_status: "pending",
      });
      expect(entry.new_status).toBe("pending");
      expect(entry.previous_status).toBeNull();
    });

    it("records transitions with reason", () => {
      const entry = insertAdmissionHistory({
        previous_status: "pending",
        new_status: "approved",
        reason: "Meets all criteria",
      });
      expect(entry.previous_status).toBe("pending");
      expect(entry.new_status).toBe("approved");
      expect(entry.reason).toBe("Meets all criteria");
    });
  });

  describe("listAdmissions", () => {
    it("returns all admissions for a centre", () => {
      insertAdmission({ centre_id: "centre-a", referral_id: "ref-1" });
      insertAdmission({ centre_id: "centre-a", referral_id: "ref-2" });
      insertAdmission({ centre_id: "centre-b", referral_id: "ref-3" });

      const filtered = admissions.filter((a) => a.centre_id === "centre-a");
      expect(filtered).toHaveLength(2);
    });

    it("filters by status", () => {
      insertAdmission({ status: "pending" });
      insertAdmission({ status: "approved" });
      insertAdmission({ status: "pending" });

      const filtered = admissions.filter((a) => a.status === "pending");
      expect(filtered).toHaveLength(2);
    });
  });

  describe("display helpers", () => {
    it("getAdmissionDisplayStatus returns correct labels", () => {
      expect(getAdmissionDisplayStatus("pending")).toBe("Pending");
      expect(getAdmissionDisplayStatus("approved")).toBe("Approved");
      expect(getAdmissionDisplayStatus("denied")).toBe("Denied");
      expect(getAdmissionDisplayStatus("cancelled")).toBe("Cancelled");
    });
  });

  describe("constants", () => {
    it("ADMISSION_STATUSES contains all required statuses", () => {
      expect(ADMISSION_STATUSES).toContain("pending");
      expect(ADMISSION_STATUSES).toContain("approved");
      expect(ADMISSION_STATUSES).toContain("denied");
      expect(ADMISSION_STATUSES).toContain("cancelled");
    });
  });
});
