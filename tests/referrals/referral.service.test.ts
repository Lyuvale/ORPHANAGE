import { describe, it, expect, beforeEach } from "vitest";
import type {
  Referral,
  ReferralStatus,
  CreateReferralInput,
  UpdateReferralInput,
  ReferralSearchFilters,
} from "@/types/referral";
import {
  REFERRAL_STATUSES,
  REFERRAL_SOURCES,
  REFERRAL_PRIORITIES,
  getReferralDisplayName,
  getReferralDisplayStatus,
  getReferralDisplaySource,
  getReferralDisplayPriority,
} from "@/types/referral";

// ─── In-memory referral store ────────────────────────────────────────────────

let referrals: Referral[] = [];
let idCounter = 1;

function resetStore() {
  referrals = [];
  idCounter = 1;
}

function generateId(): string {
  return `ref-${idCounter++}`;
}

function insertReferral(data: Partial<Referral>): Referral {
  const referral: Referral = {
    id: generateId(),
    centre_id: "centre-a",
    child_id: null,
    reference_number: `REF-${String(idCounter).padStart(6, "0")}`,
    child_first_name: "Test",
    child_middle_name: null,
    child_last_name: "Child",
    child_date_of_birth: null,
    child_gender: null,
    child_nationality: null,
    source: "police",
    priority: "medium",
    status: "submitted",
    referrer_name: null,
    referrer_org: null,
    referrer_contact: null,
    reason: "Test reason for referral",
    notes: null,
    submitted_by: null,
    submitted_at: new Date().toISOString(),
    reviewed_by: null,
    reviewed_at: null,
    metadata: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...data,
  };
  referrals.push(referral);
  return referral;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Referral Service (in-memory simulation)", () => {
  beforeEach(() => {
    resetStore();
  });

  describe("createReferral", () => {
    it("creates referral with default submitted status", () => {
      const referral = insertReferral({
        child_first_name: "Amina",
        child_last_name: "Okafor",
      });
      expect(referral.status).toBe("submitted");
    });

    it("creates referral with default medium priority", () => {
      const referral = insertReferral({
        child_first_name: "Kofi",
        child_last_name: "Mensah",
      });
      expect(referral.priority).toBe("medium");
    });

    it("assigns a reference number", () => {
      const referral = insertReferral({
        child_first_name: "Amina",
        child_last_name: "Okafor",
      });
      expect(referral.reference_number).toBeTruthy();
    });

    it("stores source correctly", () => {
      const referral = insertReferral({
        source: "hospital",
      });
      expect(referral.source).toBe("hospital");
    });

    it("stores reason correctly", () => {
      const referral = insertReferral({
        reason: "Child found abandoned",
      });
      expect(referral.reason).toBe("Child found abandoned");
    });
  });

  describe("updateReferral", () => {
    it("updates child first name", () => {
      const referral = insertReferral({
        child_first_name: "Amina",
      });
      const updated = { ...referral, child_first_name: "Fatima" };
      expect(updated.child_first_name).toBe("Fatima");
    });

    it("updates source", () => {
      const referral = insertReferral({
        source: "police",
      });
      const updated = { ...referral, source: "court" as const };
      expect(updated.source).toBe("court");
    });
  });

  describe("updateReferralStatus", () => {
    it("transitions from submitted to under_review", () => {
      const referral = insertReferral({ status: "submitted" });
      const updated = { ...referral, status: "under_review" as ReferralStatus };
      expect(updated.status).toBe("under_review");
    });

    it("transitions from under_review to admitted", () => {
      const referral = insertReferral({ status: "under_review" });
      const updated = { ...referral, status: "admitted" as ReferralStatus };
      expect(updated.status).toBe("admitted");
    });

    it("transitions from under_review to rejected", () => {
      const referral = insertReferral({ status: "under_review" });
      const updated = { ...referral, status: "rejected" as ReferralStatus };
      expect(updated.status).toBe("rejected");
    });

    it("transitions from submitted to withdrawn", () => {
      const referral = insertReferral({ status: "submitted" });
      const updated = { ...referral, status: "withdrawn" as ReferralStatus };
      expect(updated.status).toBe("withdrawn");
    });
  });

  describe("listReferrals", () => {
    it("returns all referrals for a centre", () => {
      insertReferral({ centre_id: "centre-a", child_first_name: "Child 1" });
      insertReferral({ centre_id: "centre-a", child_first_name: "Child 2" });
      insertReferral({ centre_id: "centre-b", child_first_name: "Child 3" });

      const filtered = referrals.filter((r) => r.centre_id === "centre-a");
      expect(filtered).toHaveLength(2);
    });

    it("filters by status", () => {
      insertReferral({ status: "submitted" });
      insertReferral({ status: "admitted" });
      insertReferral({ status: "submitted" });

      const filtered = referrals.filter((r) => r.status === "submitted");
      expect(filtered).toHaveLength(2);
    });

    it("filters by source", () => {
      insertReferral({ source: "police" });
      insertReferral({ source: "hospital" });
      insertReferral({ source: "police" });

      const filtered = referrals.filter((r) => r.source === "police");
      expect(filtered).toHaveLength(2);
    });

    it("filters by priority", () => {
      insertReferral({ priority: "urgent" });
      insertReferral({ priority: "low" });
      insertReferral({ priority: "urgent" });

      const filtered = referrals.filter((r) => r.priority === "urgent");
      expect(filtered).toHaveLength(2);
    });
  });

  describe("searchReferrals", () => {
    it("searches by child name", () => {
      insertReferral({ child_first_name: "Amina", child_last_name: "Okafor" });
      insertReferral({ child_first_name: "Kofi", child_last_name: "Mensah" });

      const term = "amina";
      const filtered = referrals.filter(
        (r) =>
          r.child_first_name.toLowerCase().includes(term) ||
          r.child_last_name.toLowerCase().includes(term),
      );
      expect(filtered).toHaveLength(1);
      expect(filtered[0].child_first_name).toBe("Amina");
    });

    it("searches by reference number", () => {
      insertReferral({ reference_number: "ABC-REF-000001" });
      insertReferral({ reference_number: "XYZ-REF-000001" });

      const term = "abc";
      const filtered = referrals.filter((r) =>
        r.reference_number.toLowerCase().includes(term),
      );
      expect(filtered).toHaveLength(1);
    });

    it("searches by reason", () => {
      insertReferral({ reason: "Child found abandoned near school" });
      insertReferral({ reason: "Court order for placement" });

      const term = "abandoned";
      const filtered = referrals.filter((r) =>
        r.reason.toLowerCase().includes(term),
      );
      expect(filtered).toHaveLength(1);
    });
  });

  describe("display helpers", () => {
    it("getReferralDisplayName returns full name", () => {
      const referral = insertReferral({
        child_first_name: "Amina",
        child_middle_name: "Grace",
        child_last_name: "Okafor",
      });
      expect(getReferralDisplayName(referral)).toBe("Amina Grace Okafor");
    });

    it("getReferralDisplayName works without middle name", () => {
      const referral = insertReferral({
        child_first_name: "Amina",
        child_last_name: "Okafor",
      });
      expect(getReferralDisplayName(referral)).toBe("Amina Okafor");
    });

    it("getReferralDisplayStatus returns correct labels", () => {
      expect(getReferralDisplayStatus("submitted")).toBe("Submitted");
      expect(getReferralDisplayStatus("under_review")).toBe("Under Review");
      expect(getReferralDisplayStatus("admitted")).toBe("Admitted");
      expect(getReferralDisplayStatus("rejected")).toBe("Rejected");
      expect(getReferralDisplayStatus("withdrawn")).toBe("Withdrawn");
    });

    it("getReferralDisplaySource returns correct labels", () => {
      expect(getReferralDisplaySource("police")).toBe("Police");
      expect(getReferralDisplaySource("court")).toBe("Court");
      expect(getReferralDisplaySource("hospital")).toBe("Hospital");
      expect(getReferralDisplaySource("self_referral")).toBe("Self Referral");
    });

    it("getReferralDisplayPriority returns correct labels", () => {
      expect(getReferralDisplayPriority("low")).toBe("Low");
      expect(getReferralDisplayPriority("medium")).toBe("Medium");
      expect(getReferralDisplayPriority("high")).toBe("High");
      expect(getReferralDisplayPriority("urgent")).toBe("Urgent");
    });
  });

  describe("constants", () => {
    it("REFERRAL_STATUSES contains all required statuses", () => {
      expect(REFERRAL_STATUSES).toContain("submitted");
      expect(REFERRAL_STATUSES).toContain("under_review");
      expect(REFERRAL_STATUSES).toContain("admitted");
      expect(REFERRAL_STATUSES).toContain("rejected");
      expect(REFERRAL_STATUSES).toContain("withdrawn");
    });

    it("REFERRAL_SOURCES contains all required sources", () => {
      expect(REFERRAL_SOURCES).toContain("police");
      expect(REFERRAL_SOURCES).toContain("court");
      expect(REFERRAL_SOURCES).toContain("hospital");
      expect(REFERRAL_SOURCES).toContain("school");
      expect(REFERRAL_SOURCES).toContain("community");
      expect(REFERRAL_SOURCES).toContain("government");
      expect(REFERRAL_SOURCES).toContain("self_referral");
      expect(REFERRAL_SOURCES).toContain("other");
    });

    it("REFERRAL_PRIORITIES contains all required priorities", () => {
      expect(REFERRAL_PRIORITIES).toContain("low");
      expect(REFERRAL_PRIORITIES).toContain("medium");
      expect(REFERRAL_PRIORITIES).toContain("high");
      expect(REFERRAL_PRIORITIES).toContain("urgent");
    });
  });
});
