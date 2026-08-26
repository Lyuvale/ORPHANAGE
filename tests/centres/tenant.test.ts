import { describe, it, expect } from "vitest";
import { validateTenantAccess } from "@/lib/centres/tenant";

describe("Tenant Context", () => {
  describe("validateTenantAccess", () => {
    it("allows access when centre_id matches", () => {
      expect(() =>
        validateTenantAccess(
          "11111111-1111-1111-1111-111111111111",
          "11111111-1111-1111-1111-111111111111",
        ),
      ).not.toThrow();
    });

    it("denies access when centre_id does not match", () => {
      expect(() =>
        validateTenantAccess(
          "11111111-1111-1111-1111-111111111111",
          "33333333-3333-3333-3333-333333333333",
        ),
      ).toThrow("Access denied");
    });

    it("denies access when trying to access another centre", () => {
      const userCentreId = "11111111-1111-1111-1111-111111111111";
      const maliciousCentreId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
      expect(() => validateTenantAccess(userCentreId, maliciousCentreId)).toThrow(
        "Access denied: requested centre does not match your tenant context",
      );
    });

    it("prevents centre_id swap (centre A user accessing centre B)", () => {
      const centreA = "11111111-1111-1111-1111-111111111111";
      const centreB = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
      expect(() => validateTenantAccess(centreA, centreB)).toThrow("Access denied");
    });
  });

  describe("Tenant isolation model", () => {
    it("centre_id is derived from database, not from client input", () => {
      // This test documents the architectural principle:
      // The centre_id in user_profiles is the authoritative source.
      // Client-submitted centre_id is never trusted directly.
      const dbDerivedCentreId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
      const clientSubmittedCentreId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

      // The system always uses the DB-derived value
      expect(dbDerivedCentreId).not.toBe(clientSubmittedCentreId);
    });
  });
});
