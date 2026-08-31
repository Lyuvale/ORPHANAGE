import { describe, it, expect } from "vitest";
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ALL_PERMISSIONS,
  CENTRE_ROLES,
} from "@/types/role";

const OTHER_ROLES = CENTRE_ROLES.filter((r) => r !== "CENTRE_MANAGER");

describe("Subscription Permissions", () => {
  it("defines the subscription permissions", () => {
    expect(PERMISSIONS.SUBSCRIPTIONS_VIEW).toBe("subscriptions.view");
    expect(PERMISSIONS.SUBSCRIPTIONS_MANAGE).toBe("subscriptions.manage");
    expect(PERMISSIONS.SUBSCRIPTIONS_VIEW_OWN).toBe("subscriptions.view_own");
    expect(ALL_PERMISSIONS).toContain("subscriptions.view");
    expect(ALL_PERMISSIONS).toContain("subscriptions.manage");
    expect(ALL_PERMISSIONS).toContain("subscriptions.view_own");
  });

  it("grants platform subscription view/manage to CENTRE_MANAGER only", () => {
    expect(ROLE_PERMISSIONS.CENTRE_MANAGER).toContain("subscriptions.view");
    expect(ROLE_PERMISSIONS.CENTRE_MANAGER).toContain("subscriptions.manage");
    for (const role of OTHER_ROLES) {
      expect(ROLE_PERMISSIONS[role]).not.toContain("subscriptions.view");
      expect(ROLE_PERMISSIONS[role]).not.toContain("subscriptions.manage");
    }
  });

  it("grants own-subscription self-service view to every centre role", () => {
    for (const role of CENTRE_ROLES) {
      expect(ROLE_PERMISSIONS[role]).toContain("subscriptions.view_own");
    }
  });

  it("does not allow non-managers to manage subscriptions", () => {
    for (const role of OTHER_ROLES) {
      expect(ROLE_PERMISSIONS[role]).not.toContain("subscriptions.manage");
    }
  });
});
