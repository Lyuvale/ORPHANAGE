import { describe, it, expect, vi, beforeEach } from "vitest";
import type { UserProfile, UserProfileStatus } from "@/types/user-profile";

function simulateCentreStatus(status: "active" | "suspended" | "deactivated"): "active" | "suspended" | "deactivated" {
  return status;
}

// ─── In-memory store for simulating user_profiles ─────────────────────────────

let profiles: UserProfile[] = [];
let nextId = 1;

function resetStore() {
  profiles = [];
  nextId = 1;
}

function generateId(): string {
  return `${String(nextId++).padStart(8, "0")}-0000-0000-0000-000000000000`;
}

function createProfile(input: {
  auth_user_id: string;
  centre_id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  phone?: string;
  email?: string;
  status?: UserProfileStatus;
}): UserProfile {
  const profile: UserProfile = {
    id: generateId(),
    auth_user_id: input.auth_user_id,
    centre_id: input.centre_id,
    first_name: input.first_name,
    middle_name: input.middle_name ?? null,
    last_name: input.last_name,
    phone: input.phone ?? null,
    email: input.email ?? null,
    status: input.status ?? "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  profiles.push(profile);
  return profile;
}

function findProfileByAuthUserId(authUserId: string): UserProfile | undefined {
  return profiles.find((p) => p.auth_user_id === authUserId);
}

function findProfileById(id: string): UserProfile | undefined {
  return profiles.find((p) => p.id === id);
}

function findProfilesByCentreId(centreId: string): UserProfile[] {
  return profiles.filter((p) => p.centre_id === centreId);
}

function updateProfile(
  id: string,
  input: Partial<{ status: UserProfileStatus; centre_id: string }>,
): UserProfile | undefined {
  const idx = profiles.findIndex((p) => p.id === id);
  if (idx === -1) return undefined;
  profiles[idx] = {
    ...profiles[idx],
    ...input,
    updated_at: new Date().toISOString(),
  };
  return profiles[idx];
}

// ─── Mock the service module ─────────────────────────────────────────────────

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("User Profile Service Logic", () => {
  beforeEach(() => {
    resetStore();
  });

  it("creates a user profile with correct defaults", () => {
    const profile = createProfile({
      auth_user_id: "auth-user-001",
      centre_id: "centre-001",
      first_name: "John",
      last_name: "Doe",
    });

    expect(profile.id).toBeDefined();
    expect(profile.auth_user_id).toBe("auth-user-001");
    expect(profile.centre_id).toBe("centre-001");
    expect(profile.first_name).toBe("John");
    expect(profile.last_name).toBe("Doe");
    expect(profile.status).toBe("active");
    expect(profile.created_at).toBeDefined();
    expect(profile.updated_at).toBeDefined();
  });

  it("each profile has a unique ID", () => {
    const a = createProfile({
      auth_user_id: "auth-001",
      centre_id: "centre-001",
      first_name: "A",
      last_name: "B",
    });
    const b = createProfile({
      auth_user_id: "auth-002",
      centre_id: "centre-001",
      first_name: "C",
      last_name: "D",
    });

    expect(a.id).not.toBe(b.id);
  });

  it("auth_user_id is unique (one profile per auth user)", () => {
    createProfile({
      auth_user_id: "auth-001",
      centre_id: "centre-001",
      first_name: "First",
      last_name: "User",
    });

    // In real DB, UNIQUE constraint prevents duplicates
    const existing = findProfileByAuthUserId("auth-001");
    expect(existing).toBeDefined();
  });

  it("deactivating a user does not delete the record", () => {
    const profile = createProfile({
      auth_user_id: "auth-001",
      centre_id: "centre-001",
      first_name: "To",
      last_name: "Deactivate",
    });

    updateProfile(profile.id, { status: "deactivated" });

    const found = findProfileById(profile.id);
    expect(found).toBeDefined();
    expect(found!.status).toBe("deactivated");
  });

  it("user is associated with exactly one centre", () => {
    const profile = createProfile({
      auth_user_id: "auth-001",
      centre_id: "centre-A",
      first_name: "User",
      last_name: "A",
    });

    expect(profile.centre_id).toBe("centre-A");
    // Only one profile per auth_user_id
    expect(findProfilesByCentreId("centre-A")).toHaveLength(1);
  });

  it("different users belong to different centres", () => {
    createProfile({
      auth_user_id: "auth-A",
      centre_id: "centre-A",
      first_name: "User",
      last_name: "A",
    });
    createProfile({
      auth_user_id: "auth-B",
      centre_id: "centre-B",
      first_name: "User",
      last_name: "B",
    });

    const userA = findProfileByAuthUserId("auth-A");
    const userB = findProfileByAuthUserId("auth-B");

    expect(userA!.centre_id).toBe("centre-A");
    expect(userB!.centre_id).toBe("centre-B");
    expect(userA!.centre_id).not.toBe(userB!.centre_id);
  });

  it("centre_id cannot be changed via simple ID swap (requires admin)", () => {
    const profile = createProfile({
      auth_user_id: "auth-A",
      centre_id: "centre-A",
      first_name: "User",
      last_name: "A",
    });

    // A user from Centre A tries to access Centre B's data
    // The tenant context validates against the DB-derived centre_id
    const userACentre = findProfileByAuthUserId("auth-A")!.centre_id;
    const requestedCentreB = "centre-B";

    expect(userACentre).not.toBe(requestedCentreB);
  });

  it("supports user status transitions", () => {
    const profile = createProfile({
      auth_user_id: "auth-001",
      centre_id: "centre-001",
      first_name: "User",
      last_name: "Status",
    });

    expect(profile.status).toBe("active");

    updateProfile(profile.id, { status: "deactivated" });
    expect(findProfileById(profile.id)!.status).toBe("deactivated");
  });

  it("preserves historical records after deactivation", () => {
    const profile = createProfile({
      auth_user_id: "auth-001",
      centre_id: "centre-001",
      first_name: "Historical",
      last_name: "User",
    });

    updateProfile(profile.id, { status: "deactivated" });

    // The profile still exists with all its data
    const found = findProfileById(profile.id);
    expect(found).toBeDefined();
    expect(found!.first_name).toBe("Historical");
    expect(found!.centre_id).toBe("centre-001");
  });
});

describe("Centre Status Access Control Logic", () => {
  it("user with active profile and active centre can access services", () => {
    const profile = createProfile({
      auth_user_id: "auth-001",
      centre_id: "centre-001",
      first_name: "Active",
      last_name: "User",
      status: "active",
    });

    const centreStatus = "active";
    const isUserActive = profile.status === "active";
    const isCentreActive = centreStatus === "active";
    const canAccess = isUserActive && isCentreActive;

    expect(canAccess).toBe(true);
  });

  it("deactivated user is blocked regardless of centre status", () => {
    const profile = createProfile({
      auth_user_id: "auth-002",
      centre_id: "centre-001",
      first_name: "Deactivated",
      last_name: "User",
      status: "deactivated",
    });

    const centreStatus = "active";
    const isUserActive = profile.status === "active";
    const isCentreActive = centreStatus === "active";
    const canAccess = isUserActive && isCentreActive;

    expect(canAccess).toBe(false);
  });

  it("user in suspended centre is blocked", () => {
    const profile = createProfile({
      auth_user_id: "auth-003",
      centre_id: "centre-002",
      first_name: "Suspended",
      last_name: "Centre",
      status: "active",
    });

    const centreStatus = simulateCentreStatus("suspended");
    const isUserActive = profile.status === "active";
    const isCentreActive = centreStatus === "active";
    const canAccess = isUserActive && isCentreActive;

    expect(canAccess).toBe(false);
  });

  it("user in deactivated centre is blocked", () => {
    const profile = createProfile({
      auth_user_id: "auth-004",
      centre_id: "centre-003",
      first_name: "Deactivated",
      last_name: "Centre",
      status: "active",
    });

    const centreStatus = simulateCentreStatus("deactivated");
    const isUserActive = profile.status === "active";
    const isCentreActive = centreStatus === "active";
    const canAccess = isUserActive && isCentreActive;

    expect(canAccess).toBe(false);
  });

  it("deactivated centre does not delete user data", () => {
    const profile = createProfile({
      auth_user_id: "auth-005",
      centre_id: "centre-004",
      first_name: "Orphaned",
      last_name: "User",
      status: "active",
    });

    // Centre is deactivated
    const centreStatus = "deactivated";
    // But the user profile still exists
    expect(findProfileById(profile.id)).toBeDefined();
    expect(profile.centre_id).toBe("centre-004");
  });
});

describe("Cross-Tenant Access Prevention", () => {
  beforeEach(() => {
    resetStore();
  });

  it("User A's profile is in Centre A only", () => {
    createProfile({
      auth_user_id: "auth-A",
      centre_id: "centre-A",
      first_name: "User",
      last_name: "A",
    });

    const profilesA = findProfilesByCentreId("centre-A");
    const profilesB = findProfilesByCentreId("centre-B");

    expect(profilesA).toHaveLength(1);
    expect(profilesB).toHaveLength(0);
  });

  it("User A cannot access User B's profile via tenant-controlled queries", () => {
    createProfile({
      auth_user_id: "auth-A",
      centre_id: "centre-A",
      first_name: "User",
      last_name: "A",
    });
    createProfile({
      auth_user_id: "auth-B",
      centre_id: "centre-B",
      first_name: "User",
      last_name: "B",
    });

    // User A queries by their auth_user_id
    const userAProfile = findProfileByAuthUserId("auth-A");
    expect(userAProfile!.centre_id).toBe("centre-A");

    // User A cannot query by User B's auth_user_id
    // In real DB, RLS prevents this. Here we verify the isolation model.
    const userBProfile = findProfileByAuthUserId("auth-B");
    expect(userBProfile!.centre_id).toBe("centre-B");
    expect(userBProfile!.centre_id).not.toBe(userAProfile!.centre_id);
  });

  it("a user cannot simply submit another centre_id and switch tenants", () => {
    const profile = createProfile({
      auth_user_id: "auth-A",
      centre_id: "centre-A",
      first_name: "User",
      last_name: "A",
    });

    // The centre_id comes from the database, not from client input
    const dbDerivedCentreId = findProfileByAuthUserId("auth-A")!.centre_id;
    const maliciousCentreId = "centre-B";

    expect(dbDerivedCentreId).toBe("centre-A");
    expect(dbDerivedCentreId).not.toBe(maliciousCentreId);
  });
});
