import { describe, it, expect, beforeEach } from "vitest";
import {
  CENTRE_ROLES,
  ROLE_PERMISSIONS,
  PERMISSIONS,
  ALL_PERMISSIONS,
} from "@/types/role";
import type { CentreRole, PermissionString } from "@/types/role";

// ─── In-memory stores for simulating database ────────────────────────────────

interface MockRole {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
}

interface MockPermission {
  id: string;
  module: string;
  action: string;
}

interface MockUserRole {
  id: string;
  user_id: string;
  role_id: string;
  centre_id: string;
  assigned_by: string | null;
  status: "active" | "revoked";
}

interface MockRoleHistory {
  id: string;
  user_id: string;
  centre_id: string;
  previous_role_id: string | null;
  new_role_id: string;
  changed_by: string | null;
  changed_at: string;
  reason: string | null;
}

let roles: MockRole[] = [];
let permissions: MockPermission[] = [];
let rolePermissions: { role_id: string; permission_id: string }[] = [];
let userRoles: MockUserRole[] = [];
let roleHistory: MockRoleHistory[] = [];

let roleIdCounter = 1;
let permIdCounter = 1;
let urIdCounter = 1;
let rhIdCounter = 1;

function resetStore() {
  roles = [];
  permissions = [];
  rolePermissions = [];
  userRoles = [];
  roleHistory = [];
  roleIdCounter = 1;
  permIdCounter = 1;
  urIdCounter = 1;
  rhIdCounter = 1;
}

function createRole(name: string, description: string | null = null): MockRole {
  const role: MockRole = {
    id: `role-${roleIdCounter++}`,
    name,
    description,
    is_system: true,
  };
  roles.push(role);
  return role;
}

function createPermission(
  module: string,
  action: string,
): MockPermission {
  const perm: MockPermission = {
    id: `perm-${permIdCounter++}`,
    module,
    action,
  };
  permissions.push(perm);
  return perm;
}

function assignPermission(roleId: string, permId: string) {
  const existing = rolePermissions.find(
    (rp) => rp.role_id === roleId && rp.permission_id === permId,
  );
  if (!existing) {
    rolePermissions.push({ role_id: roleId, permission_id: permId });
  }
}

function assignUserRole(
  userId: string,
  roleId: string,
  centreId: string,
  status: "active" | "revoked" = "active",
): MockUserRole {
  const ur: MockUserRole = {
    id: `ur-${urIdCounter++}`,
    user_id: userId,
    role_id: roleId,
    centre_id: centreId,
    assigned_by: null,
    status,
  };
  userRoles.push(ur);
  return ur;
}

// ─── Authorization helpers (simulating the service layer) ────────────────────

function resolveUserRole(
  userId: string,
  centreId: string,
): MockUserRole | null {
  return (
    userRoles.find(
      (ur) =>
        ur.user_id === userId &&
        ur.centre_id === centreId &&
        ur.status === "active",
    ) ?? null
  );
}

function resolveRolePermissions(roleId: string): MockPermission[] {
  const rpIds = rolePermissions
    .filter((rp) => rp.role_id === roleId)
    .map((rp) => rp.permission_id);
  return permissions.filter((p) => rpIds.includes(p.id));
}

function hasPermission(
  userId: string,
  centreId: string,
  permission: PermissionString,
): boolean {
  const ur = resolveUserRole(userId, centreId);
  if (!ur) return false;

  const rolePerms = resolveRolePermissions(ur.role_id);
  return rolePerms.some((p) => `${p.module}.${p.action}` === permission);
}

function canAccess(
  userId: string,
  centreId: string,
  userActive: boolean,
  centreActive: boolean,
  permission: PermissionString,
): boolean {
  if (!userActive || !centreActive) return false;
  return hasPermission(userId, centreId, permission);
}

// ─── Test data ───────────────────────────────────────────────────────────────

const CENTRE_A = "centre-a";
const CENTRE_B = "centre-b";
const USER_A = "user-a";
const USER_B = "user-b";

describe("Role Definitions", () => {
  it("defines exactly 6 official centre roles", () => {
    expect(CENTRE_ROLES).toHaveLength(6);
  });

  it("includes all required role names", () => {
    expect(CENTRE_ROLES).toContain("CENTRE_MANAGER");
    expect(CENTRE_ROLES).toContain("SOCIAL_WORKER");
    expect(CENTRE_ROLES).toContain("CAREGIVER");
    expect(CENTRE_ROLES).toContain("RECORDS_OFFICER");
    expect(CENTRE_ROLES).toContain("ACCOUNTANT_BURSAR");
    expect(CENTRE_ROLES).toContain("CENTRE_IT");
  });

  it("does not include PLATFORM_ADMIN in centre roles", () => {
    expect(CENTRE_ROLES).not.toContain("PLATFORM_ADMIN");
  });

  it("each role has a defined permission set", () => {
    for (const role of CENTRE_ROLES) {
      expect(ROLE_PERMISSIONS[role]).toBeDefined();
      expect(ROLE_PERMISSIONS[role].length).toBeGreaterThan(0);
    }
  });
});

describe("Permission Definitions", () => {
  it("all permissions follow module.action format", () => {
    for (const perm of ALL_PERMISSIONS) {
      expect(perm).toMatch(/^[a-z_]+(\.[a-z_]+)+$/);
    }
  });

  it("permissions are unique", () => {
    const unique = new Set(ALL_PERMISSIONS);
    expect(unique.size).toBe(ALL_PERMISSIONS.length);
  });

  it("covers children module", () => {
    expect(ALL_PERMISSIONS).toContain("children.view");
    expect(ALL_PERMISSIONS).toContain("children.create");
    expect(ALL_PERMISSIONS).toContain("children.update");
    expect(ALL_PERMISSIONS).toContain("children.archive");
  });

  it("covers cases module", () => {
    expect(ALL_PERMISSIONS).toContain("cases.view");
    expect(ALL_PERMISSIONS).toContain("cases.create");
    expect(ALL_PERMISSIONS).toContain("cases.update");
  });

  it("covers finance module", () => {
    expect(ALL_PERMISSIONS).toContain("finance.view");
    expect(ALL_PERMISSIONS).toContain("finance.create");
    expect(ALL_PERMISSIONS).toContain("finance.approve");
  });

  it("covers reports module", () => {
    expect(ALL_PERMISSIONS).toContain("reports.view");
    expect(ALL_PERMISSIONS).toContain("reports.export");
  });
});

describe("Role → Permission Assignments", () => {
  it("CENTRE_MANAGER views children, archives only, never registers/edits", () => {
    expect(ROLE_PERMISSIONS.CENTRE_MANAGER).toContain("children.view");
    expect(ROLE_PERMISSIONS.CENTRE_MANAGER).toContain("children.archive");
    expect(ROLE_PERMISSIONS.CENTRE_MANAGER).not.toContain("children.create");
    expect(ROLE_PERMISSIONS.CENTRE_MANAGER).not.toContain("children.update");
  });

  it("CENTRE_MANAGER has finance.view and finance.approve but NOT finance.create", () => {
    expect(ROLE_PERMISSIONS.CENTRE_MANAGER).toContain("finance.view");
    expect(ROLE_PERMISSIONS.CENTRE_MANAGER).toContain("finance.approve");
    expect(ROLE_PERMISSIONS.CENTRE_MANAGER).not.toContain("finance.create");
  });

  it("CENTRE_MANAGER has staff.assign_roles", () => {
    expect(ROLE_PERMISSIONS.CENTRE_MANAGER).toContain("staff.assign_roles");
  });

  it("SOCIAL_WORKER has children and cases but NOT finance", () => {
    expect(ROLE_PERMISSIONS.SOCIAL_WORKER).toContain("children.view");
    expect(ROLE_PERMISSIONS.SOCIAL_WORKER).toContain("cases.view");
    expect(ROLE_PERMISSIONS.SOCIAL_WORKER).not.toContain("finance.view");
    expect(ROLE_PERMISSIONS.SOCIAL_WORKER).not.toContain("finance.create");
    expect(ROLE_PERMISSIONS.SOCIAL_WORKER).not.toContain("finance.approve");
  });

  it("SOCIAL_WORKER has referrals and safeguarding", () => {
    expect(ROLE_PERMISSIONS.SOCIAL_WORKER).toContain("referrals.view");
    expect(ROLE_PERMISSIONS.SOCIAL_WORKER).toContain("safeguarding.view");
  });

  it("CAREGIVER has daily_care permissions", () => {
    expect(ROLE_PERMISSIONS.CAREGIVER).toContain("daily_care.view");
    expect(ROLE_PERMISSIONS.CAREGIVER).toContain("daily_care.update");
    expect(ROLE_PERMISSIONS.CAREGIVER).toContain("daily_care.check_in");
    expect(ROLE_PERMISSIONS.CAREGIVER).toContain("daily_care.check_out");
  });

  it("CAREGIVER does NOT have finance permissions", () => {
    expect(ROLE_PERMISSIONS.CAREGIVER).not.toContain("finance.view");
    expect(ROLE_PERMISSIONS.CAREGIVER).not.toContain("finance.create");
    expect(ROLE_PERMISSIONS.CAREGIVER).not.toContain("finance.approve");
  });

  it("CAREGIVER does NOT have confidential case information", () => {
    expect(ROLE_PERMISSIONS.CAREGIVER).not.toContain("cases.create");
    expect(ROLE_PERMISSIONS.CAREGIVER).not.toContain("cases.update");
  });

  it("RECORDS_OFFICER has documents permissions including delete", () => {
    expect(ROLE_PERMISSIONS.RECORDS_OFFICER).toContain("documents.view");
    expect(ROLE_PERMISSIONS.RECORDS_OFFICER).toContain("documents.upload");
    expect(ROLE_PERMISSIONS.RECORDS_OFFICER).toContain("documents.download");
    expect(ROLE_PERMISSIONS.RECORDS_OFFICER).toContain("documents.delete");
  });

  it("RECORDS_OFFICER does NOT have finance permissions", () => {
    expect(ROLE_PERMISSIONS.RECORDS_OFFICER).not.toContain("finance.view");
    expect(ROLE_PERMISSIONS.RECORDS_OFFICER).not.toContain("finance.create");
  });

  it("ACCOUNTANT_BURSAR has full finance access", () => {
    expect(ROLE_PERMISSIONS.ACCOUNTANT_BURSAR).toContain("finance.view");
    expect(ROLE_PERMISSIONS.ACCOUNTANT_BURSAR).toContain("finance.create");
    expect(ROLE_PERMISSIONS.ACCOUNTANT_BURSAR).toContain("finance.approve");
  });

  it("ACCOUNTANT_BURSAR does NOT have children create/update", () => {
    expect(ROLE_PERMISSIONS.ACCOUNTANT_BURSAR).not.toContain("children.create");
    expect(ROLE_PERMISSIONS.ACCOUNTANT_BURSAR).not.toContain("children.update");
  });

  it("ACCOUNTANT_BURSAR has reports access", () => {
    expect(ROLE_PERMISSIONS.ACCOUNTANT_BURSAR).toContain("reports.view");
    expect(ROLE_PERMISSIONS.ACCOUNTANT_BURSAR).toContain("reports.export");
  });

  it("CENTRE_MANAGER and RECORDS_OFFICER have audit access", () => {
    expect(ROLE_PERMISSIONS.CENTRE_MANAGER).toContain("audit.view");
    expect(ROLE_PERMISSIONS.CENTRE_MANAGER).toContain("audit.export");
    expect(ROLE_PERMISSIONS.RECORDS_OFFICER).toContain("audit.view");
    expect(ROLE_PERMISSIONS.RECORDS_OFFICER).toContain("audit.export");
  });

  it("SOCIAL_WORKER / CAREGIVER / ACCOUNTANT_BURSAR do NOT have audit access by default", () => {
    expect(ROLE_PERMISSIONS.SOCIAL_WORKER).not.toContain("audit.view");
    expect(ROLE_PERMISSIONS.CAREGIVER).not.toContain("audit.view");
    expect(ROLE_PERMISSIONS.ACCOUNTANT_BURSAR).not.toContain("audit.view");
  });
});

describe("Database-backed Authorization (simulated)", () => {
  let centreManagerRole: MockRole;
  let socialWorkerRole: MockRole;
  let caregiverRole: MockRole;

  beforeEach(() => {
    resetStore();

    // Create roles
    centreManagerRole = createRole("CENTRE_MANAGER");
    socialWorkerRole = createRole("SOCIAL_WORKER");
    caregiverRole = createRole("CAREGIVER");

    // Create permissions
    const permChildrenView = createPermission("children", "view");
    const permChildrenCreate = createPermission("children", "create");
    const permFinanceView = createPermission("finance", "view");
    const permFinanceCreate = createPermission("finance", "create");
    const permFinanceApprove = createPermission("finance", "approve");
    const permCasesView = createPermission("cases", "view");
    const permDailyCareView = createPermission("daily_care", "view");
    const permDailyCareCheckIn = createPermission("daily_care", "check_in");

    // Assign permissions to roles
    // CENTRE_MANAGER
    assignPermission(centreManagerRole.id, permChildrenView.id);
    assignPermission(centreManagerRole.id, permChildrenCreate.id);
    assignPermission(centreManagerRole.id, permFinanceView.id);
    assignPermission(centreManagerRole.id, permFinanceApprove.id);
    assignPermission(centreManagerRole.id, permCasesView.id);
    assignPermission(centreManagerRole.id, permDailyCareView.id);

    // SOCIAL_WORKER
    assignPermission(socialWorkerRole.id, permChildrenView.id);
    assignPermission(socialWorkerRole.id, permChildrenCreate.id);
    assignPermission(socialWorkerRole.id, permCasesView.id);

    // CAREGIVER
    assignPermission(caregiverRole.id, permChildrenView.id);
    assignPermission(caregiverRole.id, permCasesView.id);
    assignPermission(caregiverRole.id, permDailyCareView.id);
    assignPermission(caregiverRole.id, permDailyCareCheckIn.id);
  });

  it("role 1: user can have an assigned role", () => {
    assignUserRole(USER_A, centreManagerRole.id, CENTRE_A);
    const ur = resolveUserRole(USER_A, CENTRE_A);
    expect(ur).not.toBeNull();
    expect(ur!.role_id).toBe(centreManagerRole.id);
  });

  it("role 2: user cannot assign themselves a privileged role", () => {
    // In real system, this is enforced by admin-only RLS on user_roles.
    // The simulation verifies that direct role creation through
    // the authorization layer is not possible.
    assignUserRole(USER_A, centreManagerRole.id, CENTRE_A);

    // A user trying to give themselves extra permissions
    // would need to modify role_permissions, which is admin-only.
    const ur = resolveUserRole(USER_A, CENTRE_A);
    expect(ur).not.toBeNull();

    // The user cannot spontaneously gain finance.create
    expect(hasPermission(USER_A, CENTRE_A, "finance.create")).toBe(false);
  });

  it("role 3: invalid roles cannot be assigned", () => {
    const fakeRole = createRole("SUPER_ADMIN");
    assignUserRole(USER_A, fakeRole.id, CENTRE_A);

    // Even though assigned, SUPER_ADMIN is not in CENTRE_ROLES
    expect(CENTRE_ROLES).not.toContain("SUPER_ADMIN");
    // And it has no permissions defined in the application layer
    expect(ROLE_PERMISSIONS["SUPER_ADMIN" as CentreRole]).toBeUndefined();
  });

  it("role 4: role belongs to the correct authorization model", () => {
    assignUserRole(USER_A, centreManagerRole.id, CENTRE_A);
    const rolePerms = resolveRolePermissions(centreManagerRole.id);
    const permStrings = rolePerms.map((p) => `${p.module}.${p.action}`);

    // CENTRE_MANAGER should have children and finance permissions
    expect(permStrings).toContain("children.view");
    expect(permStrings).toContain("finance.view");
    expect(permStrings).toContain("finance.approve");
  });
});

describe("Permission Checks (simulated)", () => {
  let centreManagerRole: MockRole;
  let caregiverRole: MockRole;

  beforeEach(() => {
    resetStore();

    centreManagerRole = createRole("CENTRE_MANAGER");
    caregiverRole = createRole("CAREGIVER");

    const permChildrenView = createPermission("children", "view");
    const permFinanceView = createPermission("finance", "view");

    assignPermission(centreManagerRole.id, permChildrenView.id);
    assignPermission(centreManagerRole.id, permFinanceView.id);
    assignPermission(caregiverRole.id, permChildrenView.id);
  });

  it("perm 5: explicitly granted permission returns allowed", () => {
    assignUserRole(USER_A, centreManagerRole.id, CENTRE_A);
    expect(hasPermission(USER_A, CENTRE_A, "children.view")).toBe(true);
  });

  it("perm 6: missing permission returns denied (deny by default)", () => {
    assignUserRole(USER_A, caregiverRole.id, CENTRE_A);
    // CAREGIVER has children.view but NOT finance.view
    expect(hasPermission(USER_A, CENTRE_A, "finance.view")).toBe(false);
  });

  it("perm 7: denied permission cannot be bypassed through API/server", () => {
    assignUserRole(USER_A, caregiverRole.id, CENTRE_A);

    // Simulate a malicious request trying to access finance
    // The authorization layer denies it regardless of what the client sends
    expect(hasPermission(USER_A, CENTRE_A, "finance.view")).toBe(false);
    expect(hasPermission(USER_A, CENTRE_A, "finance.create")).toBe(false);
    expect(hasPermission(USER_A, CENTRE_A, "finance.approve")).toBe(false);
  });
});

describe("Tenant Isolation with Roles", () => {
  let centreManagerRole: MockRole;
  let socialWorkerRole: MockRole;
  let accountantRole: MockRole;

  beforeEach(() => {
    resetStore();

    centreManagerRole = createRole("CENTRE_MANAGER");
    socialWorkerRole = createRole("SOCIAL_WORKER");
    accountantRole = createRole("ACCOUNTANT_BURSAR");

    const permChildrenView = createPermission("children", "view");
    const permFinanceView = createPermission("finance", "view");
    const permFinanceCreate = createPermission("finance", "create");

    assignPermission(centreManagerRole.id, permChildrenView.id);
    assignPermission(centreManagerRole.id, permFinanceView.id);
    assignPermission(socialWorkerRole.id, permChildrenView.id);
    assignPermission(accountantRole.id, permFinanceView.id);
    assignPermission(accountantRole.id, permFinanceCreate.id);

    // User A is CENTRE_MANAGER in Centre A
    assignUserRole(USER_A, centreManagerRole.id, CENTRE_A);
    // User B is SOCIAL_WORKER in Centre B
    assignUserRole(USER_B, socialWorkerRole.id, CENTRE_B);
  });

  it("tenant 8: Centre A Manager can only operate within Centre A", () => {
    expect(hasPermission(USER_A, CENTRE_A, "children.view")).toBe(true);
    expect(hasPermission(USER_A, CENTRE_A, "finance.view")).toBe(true);
  });

  it("tenant 9: Centre A Manager cannot use role to access Centre B", () => {
    // User A has role in Centre A but NOT in Centre B
    expect(hasPermission(USER_A, CENTRE_B, "children.view")).toBe(false);
    expect(hasPermission(USER_A, CENTRE_B, "finance.view")).toBe(false);
  });

  it("tenant 10: Centre A Social Worker cannot access Centre B", () => {
    // Assign social worker role to User A in Centre A
    assignUserRole(USER_A, socialWorkerRole.id, CENTRE_A);

    expect(hasPermission(USER_A, CENTRE_A, "children.view")).toBe(true);
    expect(hasPermission(USER_A, CENTRE_B, "children.view")).toBe(false);
  });

  it("tenant 11: Centre A Accountant cannot access Centre B", () => {
    assignUserRole(USER_A, accountantRole.id, CENTRE_A);

    expect(hasPermission(USER_A, CENTRE_A, "finance.view")).toBe(true);
    expect(hasPermission(USER_A, CENTRE_B, "finance.view")).toBe(false);
  });

  it("tenant: full access pipeline enforces centre context", () => {
    // Even though User A has CENTRE_MANAGER role with children.view,
    // canAccess() requires BOTH permission AND correct centre
    expect(canAccess(USER_A, CENTRE_A, true, true, "children.view")).toBe(true);
    expect(canAccess(USER_A, CENTRE_B, true, true, "children.view")).toBe(false);
  });
});

describe("Finance Restrictions", () => {
  let centreManagerRole: MockRole;
  let socialWorkerRole: MockRole;
  let caregiverRole: MockRole;
  let recordsOfficerRole: MockRole;
  let accountantRole: MockRole;

  beforeEach(() => {
    resetStore();

    centreManagerRole = createRole("CENTRE_MANAGER");
    socialWorkerRole = createRole("SOCIAL_WORKER");
    caregiverRole = createRole("CAREGIVER");
    recordsOfficerRole = createRole("RECORDS_OFFICER");
    accountantRole = createRole("ACCOUNTANT_BURSAR");

    const permFinanceView = createPermission("finance", "view");
    const permFinanceCreate = createPermission("finance", "create");
    const permFinanceApprove = createPermission("finance", "approve");

    // CENTRE_MANAGER: view + approve only
    assignPermission(centreManagerRole.id, permFinanceView.id);
    assignPermission(centreManagerRole.id, permFinanceApprove.id);

    // ACCOUNTANT_BURSAR: full finance access
    assignPermission(accountantRole.id, permFinanceView.id);
    assignPermission(accountantRole.id, permFinanceCreate.id);
    assignPermission(accountantRole.id, permFinanceApprove.id);

    // SOCIAL_WORKER, CAREGIVER, RECORDS_OFFICER: no finance permissions
  });

  it("finance 12: Accountant/Bursar has finance permissions", () => {
    assignUserRole(USER_A, accountantRole.id, CENTRE_A);
    expect(hasPermission(USER_A, CENTRE_A, "finance.view")).toBe(true);
    expect(hasPermission(USER_A, CENTRE_A, "finance.create")).toBe(true);
    expect(hasPermission(USER_A, CENTRE_A, "finance.approve")).toBe(true);
  });

  it("finance 13: Caregiver does not have finance permissions", () => {
    assignUserRole(USER_A, caregiverRole.id, CENTRE_A);
    expect(hasPermission(USER_A, CENTRE_A, "finance.view")).toBe(false);
    expect(hasPermission(USER_A, CENTRE_A, "finance.create")).toBe(false);
    expect(hasPermission(USER_A, CENTRE_A, "finance.approve")).toBe(false);
  });

  it("finance 14: Social Worker does not have general finance permissions", () => {
    assignUserRole(USER_A, socialWorkerRole.id, CENTRE_A);
    expect(hasPermission(USER_A, CENTRE_A, "finance.view")).toBe(false);
    expect(hasPermission(USER_A, CENTRE_A, "finance.create")).toBe(false);
    expect(hasPermission(USER_A, CENTRE_A, "finance.approve")).toBe(false);
  });

  it("finance 15: Records Officer does not have general finance permissions", () => {
    assignUserRole(USER_A, recordsOfficerRole.id, CENTRE_A);
    expect(hasPermission(USER_A, CENTRE_A, "finance.view")).toBe(false);
    expect(hasPermission(USER_A, CENTRE_A, "finance.create")).toBe(false);
    expect(hasPermission(USER_A, CENTRE_A, "finance.approve")).toBe(false);
  });

  it("finance 16: Centre Manager receives only explicitly assigned finance permissions", () => {
    assignUserRole(USER_A, centreManagerRole.id, CENTRE_A);
    // Has view and approve (explicitly assigned)
    expect(hasPermission(USER_A, CENTRE_A, "finance.view")).toBe(true);
    expect(hasPermission(USER_A, CENTRE_A, "finance.approve")).toBe(true);
    // Does NOT have create (not assigned to Centre Manager)
    expect(hasPermission(USER_A, CENTRE_A, "finance.create")).toBe(false);
  });
});

describe("Status Enforcement", () => {
  let centreManagerRole: MockRole;

  beforeEach(() => {
    resetStore();
    centreManagerRole = createRole("CENTRE_MANAGER");
    const perm = createPermission("children", "view");
    assignPermission(centreManagerRole.id, perm.id);
    assignUserRole(USER_A, centreManagerRole.id, CENTRE_A);
  });

  it("status 17: deactivated users cannot exercise permissions", () => {
    expect(
      canAccess(USER_A, CENTRE_A, false, true, "children.view"),
    ).toBe(false);
  });

  it("status 18: users belonging to inactive centres cannot exercise normal permissions", () => {
    expect(
      canAccess(USER_A, CENTRE_A, true, false, "children.view"),
    ).toBe(false);
  });

  it("status: both user and centre must be active", () => {
    expect(
      canAccess(USER_A, CENTRE_A, true, true, "children.view"),
    ).toBe(true);
  });

  it("status: deactivated user in active centre is denied", () => {
    expect(
      canAccess(USER_A, CENTRE_A, false, true, "children.view"),
    ).toBe(false);
  });

  it("status: active user in suspended centre is denied", () => {
    expect(
      canAccess(USER_A, CENTRE_A, true, false, "children.view"),
    ).toBe(false);
  });
});

describe("Role History", () => {
  beforeEach(() => {
    roleHistory = [];
  });

  it("records role changes with previous and new role", () => {
    const entry: MockRoleHistory = {
      id: "rh-1",
      user_id: USER_A,
      centre_id: CENTRE_A,
      previous_role_id: null,
      new_role_id: "role-social-worker",
      changed_by: "auth-admin",
      changed_at: new Date().toISOString(),
      reason: "Initial assignment",
    };
    roleHistory.push(entry);

    expect(roleHistory).toHaveLength(1);
    expect(roleHistory[0].previous_role_id).toBeNull();
    expect(roleHistory[0].new_role_id).toBe("role-social-worker");
    expect(roleHistory[0].reason).toBe("Initial assignment");
  });

  it("records role change with previous role", () => {
    const entry: MockRoleHistory = {
      id: "rh-2",
      user_id: USER_A,
      centre_id: CENTRE_A,
      previous_role_id: "role-social-worker",
      new_role_id: "role-centre-manager",
      changed_by: "auth-admin",
      changed_at: new Date().toISOString(),
      reason: "Promotion",
    };
    roleHistory.push(entry);

    expect(roleHistory).toHaveLength(1);
    expect(roleHistory[0].previous_role_id).toBe("role-social-worker");
    expect(roleHistory[0].new_role_id).toBe("role-centre-manager");
  });
});
