import { describe, it, expect } from "vitest";
import { getTenantContext, validateTenantAccess } from "@/lib/centres/tenant";
import type { TenantContext } from "@/lib/centres/tenant";

describe("Tenant Context", () => {
  describe("getTenantContext", () => {
    it("extracts centre_id from session", async () => {
      const session = {
        user: {
          app_metadata: {
            centre_id: "11111111-1111-1111-1111-111111111111",
          },
        },
      };

      const ctx = await getTenantContext(session);
      expect(ctx.centreId).toBe("11111111-1111-1111-1111-111111111111");
    });

    it("extracts from user_metadata when app_metadata missing", async () => {
      const session = {
        user: {
          user_metadata: {
            centre_id: "22222222-2222-2222-2222-222222222222",
          },
        },
      };

      const ctx = await getTenantContext(session);
      expect(ctx.centreId).toBe("22222222-2222-2222-2222-222222222222");
    });

    it("throws when no session", async () => {
      await expect(getTenantContext(null)).rejects.toThrow(
        "Authentication required: no active session",
      );
    });

    it("throws when no user in session", async () => {
      await expect(getTenantContext({})).rejects.toThrow(
        "Authentication required: no active session",
      );
    });

    it("throws when no centre_id in claims", async () => {
      const session = {
        user: {
          app_metadata: {},
          user_metadata: {},
        },
      };

      await expect(getTenantContext(session)).rejects.toThrow(
        "No tenant context: user has no centre association",
      );
    });
  });

  describe("validateTenantAccess", () => {
    const tenant: TenantContext = {
      centreId: "11111111-1111-1111-1111-111111111111",
    };

    it("allows access when centre_id matches", () => {
      expect(() =>
        validateTenantAccess(tenant, "11111111-1111-1111-1111-111111111111"),
      ).not.toThrow();
    });

    it("denies access when centre_id does not match", () => {
      expect(() =>
        validateTenantAccess(tenant, "33333333-3333-3333-3333-333333333333"),
      ).toThrow("Access denied");
    });

    it("denies access when trying to access another centre", () => {
      const maliciousCentreId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
      expect(() => validateTenantAccess(tenant, maliciousCentreId)).toThrow(
        "Access denied: requested centre does not match your tenant context",
      );
    });
  });
});
