import { describe, it, expect } from "vitest";
import {
  createGuardianSchema,
  updateGuardianSchema,
  updateGuardianStatusSchema,
  createRelationshipSchema,
  updateRelationshipSchema,
  endRelationshipSchema,
  guardianSearchSchema,
  cleanGuardianInput,
} from "@/lib/guardians/guardian.validation";

describe("Guardian Validation", () => {
  describe("createGuardianSchema", () => {
    const validInput = {
      centre_id: "550e8400-e29b-41d4-a716-446655440000",
      first_name: "Amina",
      last_name: "Okafor",
    };

    it("accepts valid minimal input", () => {
      const result = createGuardianSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it("accepts all optional fields", () => {
      const result = createGuardianSchema.safeParse({
        ...validInput,
        middle_name: "Grace",
        preferred_name: "Fati",
        gender: "female",
        date_of_birth: "1980-05-15",
        phone: "+234-123-456",
        alternative_phone: "+234-789-012",
        email: "amina@example.com",
        address: "123 Main St",
        occupation: "Teacher",
        id_reference: "ID-12345",
        notes: "Some notes",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing centre_id", () => {
      const result = createGuardianSchema.safeParse({
        first_name: "Amina",
        last_name: "Okafor",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid centre_id", () => {
      const result = createGuardianSchema.safeParse({
        ...validInput,
        centre_id: "not-a-uuid",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing first_name", () => {
      const result = createGuardianSchema.safeParse({
        centre_id: validInput.centre_id,
        last_name: "Okafor",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing last_name", () => {
      const result = createGuardianSchema.safeParse({
        centre_id: validInput.centre_id,
        first_name: "Amina",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid email", () => {
      const result = createGuardianSchema.safeParse({
        ...validInput,
        email: "not-an-email",
      });
      expect(result.success).toBe(false);
    });

    it("accepts valid email", () => {
      const result = createGuardianSchema.safeParse({
        ...validInput,
        email: "test@example.com",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid gender", () => {
      const result = createGuardianSchema.safeParse({
        ...validInput,
        gender: "invalid",
      });
      expect(result.success).toBe(false);
    });

    it("accepts valid gender values", () => {
      for (const gender of ["male", "female", "other", "undisclosed"]) {
        const result = createGuardianSchema.safeParse({
          ...validInput,
          gender,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe("updateGuardianSchema", () => {
    it("accepts valid partial update", () => {
      const result = updateGuardianSchema.safeParse({
        first_name: "Fatima",
      });
      expect(result.success).toBe(true);
    });

    it("accepts empty string fields (converted to null)", () => {
      const result = updateGuardianSchema.safeParse({
        middle_name: "",
        phone: "",
        notes: "",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty object", () => {
      const result = updateGuardianSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("updateGuardianStatusSchema", () => {
    it("accepts valid status", () => {
      const result = updateGuardianStatusSchema.safeParse({
        new_status: "inactive",
      });
      expect(result.success).toBe(true);
    });

    it("accepts status with reason", () => {
      const result = updateGuardianStatusSchema.safeParse({
        new_status: "deceased",
        reason: "Passed away",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid status", () => {
      const result = updateGuardianStatusSchema.safeParse({
        new_status: "invalid_status",
      });
      expect(result.success).toBe(false);
    });

    it("accepts all valid statuses", () => {
      for (const status of ["active", "inactive", "deceased", "unknown"]) {
        const result = updateGuardianStatusSchema.safeParse({
          new_status: status,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe("createRelationshipSchema", () => {
    const validInput = {
      child_id: "550e8400-e29b-41d4-a716-446655440000",
      guardian_id: "660e8400-e29b-41d4-a716-446655440001",
      centre_id: "770e8400-e29b-41d4-a716-446655440002",
      relationship_type: "mother" as const,
    };

    it("accepts valid minimal input", () => {
      const result = createRelationshipSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it("accepts all optional fields", () => {
      const result = createRelationshipSchema.safeParse({
        ...validInput,
        is_primary: true,
        start_date: "2025-01-01",
        legal_authority: "parent",
        contact_permitted: false,
        visit_permitted: false,
        notes: "Important relationship",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing child_id", () => {
      const result = createRelationshipSchema.safeParse({
        guardian_id: validInput.guardian_id,
        centre_id: validInput.centre_id,
        relationship_type: "mother",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing guardian_id", () => {
      const result = createRelationshipSchema.safeParse({
        child_id: validInput.child_id,
        centre_id: validInput.centre_id,
        relationship_type: "mother",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing relationship_type", () => {
      const result = createRelationshipSchema.safeParse({
        child_id: validInput.child_id,
        guardian_id: validInput.guardian_id,
        centre_id: validInput.centre_id,
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid relationship_type", () => {
      const result = createRelationshipSchema.safeParse({
        ...validInput,
        relationship_type: "invalid_type",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid child_id", () => {
      const result = createRelationshipSchema.safeParse({
        ...validInput,
        child_id: "not-a-uuid",
      });
      expect(result.success).toBe(false);
    });

    it("accepts all valid relationship types", () => {
      const types = [
        "mother", "father", "grandparent", "sibling", "aunt", "uncle",
        "legal_guardian", "foster_caregiver", "other_relative", "other_authorised",
      ];
      for (const type of types) {
        const result = createRelationshipSchema.safeParse({
          ...validInput,
          relationship_type: type,
        });
        expect(result.success).toBe(true);
      }
    });

    it("accepts all valid legal authority types", () => {
      const authorities = ["parent", "legal_guardian", "court_authorised", "other_authorised", "none"];
      for (const auth of authorities) {
        const result = createRelationshipSchema.safeParse({
          ...validInput,
          legal_authority: auth,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe("updateRelationshipSchema", () => {
    it("accepts valid partial update", () => {
      const result = updateRelationshipSchema.safeParse({
        relationship_type: "father",
      });
      expect(result.success).toBe(true);
    });

    it("accepts permission updates", () => {
      const result = updateRelationshipSchema.safeParse({
        contact_permitted: false,
        visit_permitted: false,
      });
      expect(result.success).toBe(true);
    });

    it("accepts restriction updates", () => {
      const result = updateRelationshipSchema.safeParse({
        contact_restricted: true,
        visits_restricted: true,
        restriction_notes: "Court order",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty object", () => {
      const result = updateRelationshipSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("endRelationshipSchema", () => {
    it("accepts empty input (uses defaults)", () => {
      const result = endRelationshipSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("accepts end_date and reason", () => {
      const result = endRelationshipSchema.safeParse({
        end_date: "2025-06-01",
        reason: "Child aged out",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("guardianSearchSchema", () => {
    it("accepts empty search params", () => {
      const result = guardianSearchSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("parses limit to number", () => {
      const result = guardianSearchSchema.safeParse({ limit: "25" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(25);
      }
    });

    it("caps limit at 100", () => {
      const result = guardianSearchSchema.safeParse({ limit: "200" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(100);
      }
    });

    it("defaults limit to 50", () => {
      const result = guardianSearchSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(50);
      }
    });

    it("parses offset to number", () => {
      const result = guardianSearchSchema.safeParse({ offset: "10" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.offset).toBe(10);
      }
    });

    it("defaults offset to 0", () => {
      const result = guardianSearchSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.offset).toBe(0);
      }
    });
  });

  describe("cleanGuardianInput", () => {
    it("converts empty strings to null", () => {
      const input = { name: "", other: "value" };
      const cleaned = cleanGuardianInput(input);
      expect(cleaned.name).toBeNull();
      expect(cleaned.other).toBe("value");
    });

    it("preserves non-empty values", () => {
      const input = { name: "test", count: 42 };
      const cleaned = cleanGuardianInput(input);
      expect(cleaned.name).toBe("test");
      expect(cleaned.count).toBe(42);
    });
  });
});
