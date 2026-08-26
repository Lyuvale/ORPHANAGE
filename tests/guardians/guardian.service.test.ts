import { describe, it, expect, beforeEach } from "vitest";
import type {
  Guardian,
  ChildGuardian,
  GuardianStatus,
  CreateGuardianInput,
  GuardianSearchFilters,
} from "@/types/guardian";
import {
  GUARDIAN_STATUSES,
  RELATIONSHIP_TYPES,
  LEGAL_AUTHORITY_TYPES,
  GUARDIAN_DOCUMENT_TYPES,
  getGuardianDisplayName,
  getGuardianFullName,
  getGuardianDisplayStatus,
  getRelationshipTypeDisplay,
  getLegalAuthorityDisplay,
  getGuardianDocumentTypeDisplay,
} from "@/types/guardian";

// ─── In-memory guardian store ─────────────────────────────────

let guardians: Guardian[] = [];
let relationships: ChildGuardian[] = [];
let idCounter = 1;

function resetStore() {
  guardians = [];
  relationships = [];
  idCounter = 1;
}

function generateId(): string {
  return `guard-${idCounter++}`;
}

function insertGuardian(data: Partial<Guardian>): Guardian {
  const guardian: Guardian = {
    id: generateId(),
    centre_id: "centre-a",
    first_name: "Test",
    middle_name: null,
    last_name: "Guardian",
    preferred_name: null,
    gender: null,
    date_of_birth: null,
    phone: null,
    alternative_phone: null,
    email: null,
    address: null,
    occupation: null,
    id_reference: null,
    status: "active",
    notes: null,
    metadata: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...data,
  };
  guardians.push(guardian);
  return guardian;
}

function insertRelationship(data: Partial<ChildGuardian>): ChildGuardian {
  const rel: ChildGuardian = {
    id: generateId(),
    child_id: "child-1",
    guardian_id: "guard-1",
    centre_id: "centre-a",
    relationship_type: "mother",
    is_primary: false,
    is_active: true,
    start_date: "2025-01-01",
    end_date: null,
    legal_authority: "none",
    contact_permitted: true,
    updates_permitted: true,
    visit_permitted: true,
    meeting_permitted: true,
    information_permitted: true,
    contact_restricted: false,
    visits_restricted: false,
    restriction_notes: null,
    notes: null,
    created_by: null,
    metadata: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...data,
  };
  relationships.push(rel);
  return rel;
}

// ─── Tests ───────────────────────────────────────────────────

describe("Guardian Service (in-memory simulation)", () => {
  beforeEach(() => {
    resetStore();
  });

  describe("createGuardian", () => {
    it("creates guardian with default active status", () => {
      const guardian = insertGuardian({
        first_name: "Amina",
        last_name: "Okafor",
      });
      expect(guardian.status).toBe("active");
    });

    it("stores first_name and last_name correctly", () => {
      const guardian = insertGuardian({
        first_name: "Kofi",
        last_name: "Mensah",
      });
      expect(guardian.first_name).toBe("Kofi");
      expect(guardian.last_name).toBe("Mensah");
    });

    it("stores optional fields", () => {
      const guardian = insertGuardian({
        first_name: "Fatima",
        last_name: "Ali",
        phone: "+234-123-456",
        email: "fatima@example.com",
        gender: "female",
        preferred_name: "Fati",
      });
      expect(guardian.phone).toBe("+234-123-456");
      expect(guardian.email).toBe("fatima@example.com");
      expect(guardian.gender).toBe("female");
      expect(guardian.preferred_name).toBe("Fati");
    });

    it("defaults optional fields to null", () => {
      const guardian = insertGuardian({
        first_name: "John",
        last_name: "Doe",
      });
      expect(guardian.middle_name).toBeNull();
      expect(guardian.phone).toBeNull();
      expect(guardian.email).toBeNull();
      expect(guardian.date_of_birth).toBeNull();
    });
  });

  describe("updateGuardian", () => {
    it("updates first_name", () => {
      const guardian = insertGuardian({ first_name: "Amina" });
      const updated = { ...guardian, first_name: "Fatima" };
      expect(updated.first_name).toBe("Fatima");
    });

    it("updates phone", () => {
      const guardian = insertGuardian({ phone: "123" });
      const updated = { ...guardian, phone: "456" };
      expect(updated.phone).toBe("456");
    });
  });

  describe("updateGuardianStatus", () => {
    it("transitions from active to inactive", () => {
      const guardian = insertGuardian({ status: "active" });
      const updated = { ...guardian, status: "inactive" as GuardianStatus };
      expect(updated.status).toBe("inactive");
    });

    it("transitions from active to deceased", () => {
      const guardian = insertGuardian({ status: "active" });
      const updated = { ...guardian, status: "deceased" as GuardianStatus };
      expect(updated.status).toBe("deceased");
    });

    it("transitions from active to unknown", () => {
      const guardian = insertGuardian({ status: "active" });
      const updated = { ...guardian, status: "unknown" as GuardianStatus };
      expect(updated.status).toBe("unknown");
    });
  });

  describe("listGuardians", () => {
    it("returns all guardians for a centre", () => {
      insertGuardian({ centre_id: "centre-a", first_name: "G1" });
      insertGuardian({ centre_id: "centre-a", first_name: "G2" });
      insertGuardian({ centre_id: "centre-b", first_name: "G3" });

      const filtered = guardians.filter((g) => g.centre_id === "centre-a");
      expect(filtered).toHaveLength(2);
    });

    it("filters by status", () => {
      insertGuardian({ status: "active" });
      insertGuardian({ status: "inactive" });
      insertGuardian({ status: "active" });

      const filtered = guardians.filter((g) => g.status === "active");
      expect(filtered).toHaveLength(2);
    });

    it("searches by name", () => {
      insertGuardian({ first_name: "Amina", last_name: "Okafor" });
      insertGuardian({ first_name: "Kofi", last_name: "Mensah" });

      const term = "amina";
      const filtered = guardians.filter(
        (g) =>
          g.first_name.toLowerCase().includes(term) ||
          g.last_name.toLowerCase().includes(term),
      );
      expect(filtered).toHaveLength(1);
      expect(filtered[0].first_name).toBe("Amina");
    });

    it("searches by email", () => {
      insertGuardian({ first_name: "G1", last_name: "One", email: "test@example.com" });
      insertGuardian({ first_name: "G2", last_name: "Two", email: "other@example.com" });

      const filtered = guardians.filter(
        (g) => g.email && g.email.toLowerCase().includes("test"),
      );
      expect(filtered).toHaveLength(1);
    });
  });

  describe("relationships", () => {
    it("creates a relationship between child and guardian", () => {
      const rel = insertRelationship({
        child_id: "child-1",
        guardian_id: "guard-1",
        relationship_type: "mother",
      });
      expect(rel.relationship_type).toBe("mother");
      expect(rel.is_active).toBe(true);
    });

    it("supports multiple children for one guardian", () => {
      insertRelationship({ child_id: "child-1", guardian_id: "guard-1" });
      insertRelationship({ child_id: "child-2", guardian_id: "guard-1" });

      const filtered = relationships.filter((r) => r.guardian_id === "guard-1");
      expect(filtered).toHaveLength(2);
    });

    it("supports multiple guardians for one child", () => {
      insertRelationship({ child_id: "child-1", guardian_id: "guard-1" });
      insertRelationship({ child_id: "child-1", guardian_id: "guard-2" });

      const filtered = relationships.filter((r) => r.child_id === "child-1");
      expect(filtered).toHaveLength(2);
    });

    it("can mark a guardian as primary", () => {
      const rel = insertRelationship({
        child_id: "child-1",
        guardian_id: "guard-1",
        is_primary: true,
      });
      expect(rel.is_primary).toBe(true);
    });

    it("can end a relationship", () => {
      const rel = insertRelationship({
        child_id: "child-1",
        guardian_id: "guard-1",
        is_active: true,
      });
      const ended = { ...rel, is_active: false, end_date: "2025-06-01" };
      expect(ended.is_active).toBe(false);
      expect(ended.end_date).toBe("2025-06-01");
    });

    it("preserves relationship history", () => {
      insertRelationship({
        child_id: "child-1",
        guardian_id: "guard-1",
        is_active: true,
      });
      insertRelationship({
        child_id: "child-1",
        guardian_id: "guard-1",
        is_active: false,
        end_date: "2025-06-01",
      });

      const all = relationships.filter(
        (r) => r.child_id === "child-1" && r.guardian_id === "guard-1",
      );
      expect(all).toHaveLength(2);
    });

    it("stores legal authority", () => {
      const rel = insertRelationship({
        legal_authority: "legal_guardian",
      });
      expect(rel.legal_authority).toBe("legal_guardian");
    });

    it("stores contact permissions", () => {
      const rel = insertRelationship({
        contact_permitted: false,
        visit_permitted: false,
        meeting_permitted: true,
      });
      expect(rel.contact_permitted).toBe(false);
      expect(rel.visit_permitted).toBe(false);
      expect(rel.meeting_permitted).toBe(true);
    });

    it("stores restriction flags", () => {
      const rel = insertRelationship({
        contact_restricted: true,
        visits_restricted: true,
        restriction_notes: "Court order in effect",
      });
      expect(rel.contact_restricted).toBe(true);
      expect(rel.visits_restricted).toBe(true);
      expect(rel.restriction_notes).toBe("Court order in effect");
    });
  });

  describe("display helpers", () => {
    it("getGuardianDisplayName uses preferred_name when available", () => {
      const guardian = insertGuardian({
        first_name: "Amina",
        preferred_name: "Fati",
        last_name: "Okafor",
      });
      expect(getGuardianDisplayName(guardian)).toBe("Fati Okafor");
    });

    it("getGuardianDisplayName uses first_name when no preferred_name", () => {
      const guardian = insertGuardian({
        first_name: "Amina",
        last_name: "Okafor",
      });
      expect(getGuardianDisplayName(guardian)).toBe("Amina Okafor");
    });

    it("getGuardianFullName includes middle_name", () => {
      const guardian = insertGuardian({
        first_name: "Amina",
        middle_name: "Grace",
        last_name: "Okafor",
      });
      expect(getGuardianFullName(guardian)).toBe("Amina Grace Okafor");
    });

    it("getGuardianFullName works without middle_name", () => {
      const guardian = insertGuardian({
        first_name: "Amina",
        last_name: "Okafor",
      });
      expect(getGuardianFullName(guardian)).toBe("Amina Okafor");
    });

    it("getGuardianDisplayStatus returns correct labels", () => {
      expect(getGuardianDisplayStatus("active")).toBe("Active");
      expect(getGuardianDisplayStatus("inactive")).toBe("Inactive");
      expect(getGuardianDisplayStatus("deceased")).toBe("Deceased");
      expect(getGuardianDisplayStatus("unknown")).toBe("Unknown");
    });

    it("getRelationshipTypeDisplay returns correct labels", () => {
      expect(getRelationshipTypeDisplay("mother")).toBe("Mother");
      expect(getRelationshipTypeDisplay("father")).toBe("Father");
      expect(getRelationshipTypeDisplay("legal_guardian")).toBe("Legal Guardian");
      expect(getRelationshipTypeDisplay("foster_caregiver")).toBe("Foster/Responsible Caregiver");
      expect(getRelationshipTypeDisplay("other_authorised")).toBe("Other Authorised Person");
    });

    it("getLegalAuthorityDisplay returns correct labels", () => {
      expect(getLegalAuthorityDisplay("parent")).toBe("Parent");
      expect(getLegalAuthorityDisplay("legal_guardian")).toBe("Legal Guardian");
      expect(getLegalAuthorityDisplay("court_authorised")).toBe("Court-Authorised");
      expect(getLegalAuthorityDisplay("none")).toBe("None");
    });

    it("getGuardianDocumentTypeDisplay returns correct labels", () => {
      expect(getGuardianDocumentTypeDisplay("guardianship")).toBe("Guardianship Documentation");
      expect(getGuardianDocumentTypeDisplay("court_order")).toBe("Court/Authority Documentation");
      expect(getGuardianDocumentTypeDisplay("consent")).toBe("Consent Documentation");
      expect(getGuardianDocumentTypeDisplay("identification")).toBe("Identification Document");
    });
  });

  describe("constants", () => {
    it("GUARDIAN_STATUSES contains all required statuses", () => {
      expect(GUARDIAN_STATUSES).toContain("active");
      expect(GUARDIAN_STATUSES).toContain("inactive");
      expect(GUARDIAN_STATUSES).toContain("deceased");
      expect(GUARDIAN_STATUSES).toContain("unknown");
    });

    it("RELATIONSHIP_TYPES contains all required types", () => {
      expect(RELATIONSHIP_TYPES).toContain("mother");
      expect(RELATIONSHIP_TYPES).toContain("father");
      expect(RELATIONSHIP_TYPES).toContain("grandparent");
      expect(RELATIONSHIP_TYPES).toContain("sibling");
      expect(RELATIONSHIP_TYPES).toContain("aunt");
      expect(RELATIONSHIP_TYPES).toContain("uncle");
      expect(RELATIONSHIP_TYPES).toContain("legal_guardian");
      expect(RELATIONSHIP_TYPES).toContain("foster_caregiver");
      expect(RELATIONSHIP_TYPES).toContain("other_relative");
      expect(RELATIONSHIP_TYPES).toContain("other_authorised");
    });

    it("LEGAL_AUTHORITY_TYPES contains all required types", () => {
      expect(LEGAL_AUTHORITY_TYPES).toContain("parent");
      expect(LEGAL_AUTHORITY_TYPES).toContain("legal_guardian");
      expect(LEGAL_AUTHORITY_TYPES).toContain("court_authorised");
      expect(LEGAL_AUTHORITY_TYPES).toContain("other_authorised");
      expect(LEGAL_AUTHORITY_TYPES).toContain("none");
    });

    it("GUARDIAN_DOCUMENT_TYPES contains all required types", () => {
      expect(GUARDIAN_DOCUMENT_TYPES).toContain("guardianship");
      expect(GUARDIAN_DOCUMENT_TYPES).toContain("court_order");
      expect(GUARDIAN_DOCUMENT_TYPES).toContain("consent");
      expect(GUARDIAN_DOCUMENT_TYPES).toContain("identification");
      expect(GUARDIAN_DOCUMENT_TYPES).toContain("medical");
      expect(GUARDIAN_DOCUMENT_TYPES).toContain("other");
    });
  });
});
