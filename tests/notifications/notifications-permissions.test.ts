import { describe, it, expect } from "vitest";
import { ROLE_PERMISSIONS, PERMISSIONS, CENTRE_ROLES, ALL_PERMISSIONS } from "@/types/role";

describe("Notifications Permissions", () => {
  it("defines the notifications permissions", () => {
    expect(PERMISSIONS.NOTIFICATIONS_VIEW).toBe("notifications.view");
    expect(PERMISSIONS.NOTIFICATIONS_MANAGE).toBe("notifications.manage");
    expect(ALL_PERMISSIONS).toContain("notifications.view");
    expect(ALL_PERMISSIONS).toContain("notifications.manage");
  });

  it("granted notifications.view to every official centre role", () => {
    for (const role of CENTRE_ROLES) {
      expect(ROLE_PERMISSIONS[role]).toContain("notifications.view");
    }
  });

  it("only CENTRE_MANAGER can manage notifications preferences", () => {
    expect(ROLE_PERMISSIONS.CENTRE_MANAGER).toContain("notifications.manage");
    for (const role of CENTRE_ROLES.filter((r) => r !== "CENTRE_MANAGER")) {
      expect(ROLE_PERMISSIONS[role]).not.toContain("notifications.manage");
    }
  });

  it("view is granted but never the ability to deliver/manage for non-manager roles", () => {
    for (const role of CENTRE_ROLES.filter((r) => r !== "CENTRE_MANAGER")) {
      expect(ROLE_PERMISSIONS[role]).toContain("notifications.view");
      expect(ROLE_PERMISSIONS[role]).not.toContain("notifications.manage");
    }
  });
});
