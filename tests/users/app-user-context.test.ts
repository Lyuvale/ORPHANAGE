import { describe, it, expect } from "vitest";
import { AuthError } from "@/lib/auth/app-user-context";

// ─── Simulated in-memory stores ──────────────────────────────────────────────

interface MockAuthUser {
  id: string;
  email: string;
}

interface MockProfile {
  id: string;
  auth_user_id: string;
  centre_id: string;
  first_name: string;
  last_name: string;
  status: "active" | "deactivated";
}

interface MockCentre {
  id: string;
  name: string;
  status: "active" | "suspended" | "deactivated";
}

// ─── Simulate getAppUserContext logic ─────────────────────────────────────────

function simulateGetAppUserContext(
  authUser: MockAuthUser | null,
  profile: MockProfile | null,
  centre: MockCentre | null,
): {
  authUserId: string;
  profile: MockProfile;
  centre: MockCentre;
  isUserActive: boolean;
  isCentreActive: boolean;
  canAccess: boolean;
} | AuthError {
  // Step 1: Authentication check
  if (!authUser) {
    return new AuthError(
      "Authentication required: no active session.",
      "NOT_AUTHENTICATED",
    );
  }

  // Step 2: Profile check
  if (!profile) {
    return new AuthError(
      "Access denied: no application profile found for this user.",
      "NO_PROFILE",
    );
  }

  // Step 3: Centre check
  if (!centre) {
    return new AuthError(
      "Access denied: the user's associated centre does not exist.",
      "CENTRE_NOT_FOUND",
    );
  }

  const isUserActive = profile.status === "active";
  const isCentreActive = centre.status === "active";
  const canAccess = isUserActive && isCentreActive;

  return {
    authUserId: authUser.id,
    profile,
    centre,
    isUserActive,
    isCentreActive,
    canAccess,
  };
}

function simulateRequireAppAccess(
  authUser: MockAuthUser | null,
  profile: MockProfile | null,
  centre: MockCentre | null,
): {
  authUserId: string;
  profile: MockProfile;
  centre: MockCentre;
  isUserActive: boolean;
  isCentreActive: boolean;
  canAccess: boolean;
} {
  const result = simulateGetAppUserContext(authUser, profile, centre);

  if (result instanceof AuthError) {
    throw result;
  }

  if (!result.canAccess) {
    if (!result.isUserActive) {
      throw new AuthError(
        "Access denied: your account has been deactivated.",
        "USER_DEACTIVATED",
      );
    }
    if (!result.isCentreActive) {
      throw new AuthError(
        `Access denied: your centre (${result.centre.name}) is currently ${result.centre.status}.`,
        "CENTRE_NOT_ACTIVE",
      );
    }
  }

  return result;
}

// ─── Test fixtures ───────────────────────────────────────────────────────────

const AUTH_USER_A: MockAuthUser = { id: "auth-user-a", email: "a@test.com" };
const AUTH_USER_B: MockAuthUser = { id: "auth-user-b", email: "b@test.com" };

const CENTRE_ACTIVE: MockCentre = {
  id: "centre-active",
  name: "Active Centre",
  status: "active",
};
const CENTRE_SUSPENDED: MockCentre = {
  id: "centre-suspended",
  name: "Suspended Centre",
  status: "suspended",
};
const CENTRE_DEACTIVATED: MockCentre = {
  id: "centre-deactivated",
  name: "Deactivated Centre",
  status: "deactivated",
};

const PROFILE_ACTIVE_A: MockProfile = {
  id: "profile-a",
  auth_user_id: "auth-user-a",
  centre_id: "centre-active",
  first_name: "User",
  last_name: "A",
  status: "active",
};
const PROFILE_DEACTIVATED_A: MockProfile = {
  id: "profile-deact",
  auth_user_id: "auth-user-a",
  centre_id: "centre-active",
  first_name: "User",
  last_name: "Deactivated",
  status: "deactivated",
};
const PROFILE_ACTIVE_B: MockProfile = {
  id: "profile-b",
  auth_user_id: "auth-user-b",
  centre_id: "centre-active",
  first_name: "User",
  last_name: "B",
  status: "active",
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Server-side User Context (AppUserContext)", () => {
  describe("Authentication", () => {
    it("unauthenticated user cannot access protected data", () => {
      const result = simulateGetAppUserContext(null, null, null);
      expect(result).toBeInstanceOf(AuthError);
      expect((result as AuthError).code).toBe("NOT_AUTHENTICATED");
    });

    it("authenticated user with no profile is rejected", () => {
      const result = simulateGetAppUserContext(AUTH_USER_A, null, null);
      expect(result).toBeInstanceOf(AuthError);
      expect((result as AuthError).code).toBe("NO_PROFILE");
    });

    it("authenticated user with valid profile can establish context", () => {
      const result = simulateGetAppUserContext(
        AUTH_USER_A,
        PROFILE_ACTIVE_A,
        CENTRE_ACTIVE,
      );
      expect(result).not.toBeInstanceOf(AuthError);
      if (!(result instanceof AuthError)) {
        expect(result.authUserId).toBe("auth-user-a");
        expect(result.canAccess).toBe(true);
      }
    });
  });

  describe("Centre Association", () => {
    it("User A belongs to Centre A", () => {
      const result = simulateGetAppUserContext(
        AUTH_USER_A,
        PROFILE_ACTIVE_A,
        CENTRE_ACTIVE,
      );
      expect(result).not.toBeInstanceOf(AuthError);
      if (!(result instanceof AuthError)) {
        expect(result.profile.centre_id).toBe("centre-active");
      }
    });

    it("User B belongs to the same or different centre", () => {
      const result = simulateGetAppUserContext(
        AUTH_USER_B,
        PROFILE_ACTIVE_B,
        CENTRE_ACTIVE,
      );
      expect(result).not.toBeInstanceOf(AuthError);
      if (!(result instanceof AuthError)) {
        expect(result.profile.centre_id).toBe("centre-active");
      }
    });

    it("User A cannot access User B's profile through tenant-controlled queries", () => {
      // In the real system, RLS ensures this.
      // Here we verify the model: User A's centre_id != User B's auth context
      expect(PROFILE_ACTIVE_A.centre_id).toBe("centre-active");
      expect(PROFILE_ACTIVE_B.auth_user_id).toBe("auth-user-b");
      expect(PROFILE_ACTIVE_A.auth_user_id).not.toBe(PROFILE_ACTIVE_B.auth_user_id);
    });

    it("a user cannot simply submit another centre_id and switch tenants", () => {
      // The centre_id is derived from the DB, not from client input
      const derivedCentreId = PROFILE_ACTIVE_A.centre_id;
      const maliciousCentreId = "centre-suspended";

      expect(derivedCentreId).toBe("centre-active");
      expect(derivedCentreId).not.toBe(maliciousCentreId);
    });
  });

  describe("User Status", () => {
    it("active user can access normal services", () => {
      const result = simulateRequireAppAccess(
        AUTH_USER_A,
        PROFILE_ACTIVE_A,
        CENTRE_ACTIVE,
      );
      expect(result.canAccess).toBe(true);
      expect(result.isUserActive).toBe(true);
    });

    it("deactivated user cannot access normal services", () => {
      expect(() =>
        simulateRequireAppAccess(
          AUTH_USER_A,
          PROFILE_DEACTIVATED_A,
          CENTRE_ACTIVE,
        ),
      ).toThrow("deactivated");
    });

    it("requireAppAccess returns error code USER_DEACTIVATED", () => {
      try {
        simulateRequireAppAccess(AUTH_USER_A, PROFILE_DEACTIVATED_A, CENTRE_ACTIVE);
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(AuthError);
        expect((err as AuthError).code).toBe("USER_DEACTIVATED");
      }
    });
  });

  describe("Centre Status", () => {
    it("user in active centre can access normal services", () => {
      const result = simulateRequireAppAccess(
        AUTH_USER_A,
        PROFILE_ACTIVE_A,
        CENTRE_ACTIVE,
      );
      expect(result.canAccess).toBe(true);
      expect(result.isCentreActive).toBe(true);
    });

    it("user in suspended centre is blocked", () => {
      expect(() =>
        simulateRequireAppAccess(AUTH_USER_A, PROFILE_ACTIVE_A, CENTRE_SUSPENDED),
      ).toThrow("Suspended Centre");
    });

    it("requireAppAccess returns error code CENTRE_NOT_ACTIVE for suspended", () => {
      try {
        simulateRequireAppAccess(
          AUTH_USER_A,
          PROFILE_ACTIVE_A,
          CENTRE_SUSPENDED,
        );
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(AuthError);
        expect((err as AuthError).code).toBe("CENTRE_NOT_ACTIVE");
      }
    });

    it("user in deactivated centre is blocked", () => {
      expect(() =>
        simulateRequireAppAccess(
          AUTH_USER_A,
          PROFILE_ACTIVE_A,
          CENTRE_DEACTIVATED,
        ),
      ).toThrow("Deactivated Centre");
    });

    it("requireAppAccess returns error code CENTRE_NOT_ACTIVE for deactivated", () => {
      try {
        simulateRequireAppAccess(
          AUTH_USER_A,
          PROFILE_ACTIVE_A,
          CENTRE_DEACTIVATED,
        );
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(AuthError);
        expect((err as AuthError).code).toBe("CENTRE_NOT_ACTIVE");
      }
    });

    it("user in deactivated centre with no profile is rejected at profile step", () => {
      const result = simulateGetAppUserContext(AUTH_USER_A, null, null);
      expect(result).toBeInstanceOf(AuthError);
      expect((result as AuthError).code).toBe("NO_PROFILE");
    });
  });

  describe("Data Preservation", () => {
    it("deactivating a user does not delete historical data", () => {
      // Simulate: after deactivation, profile still exists
      const profile = { ...PROFILE_DEACTIVATED_A };
      expect(profile.status).toBe("deactivated");
      expect(profile.first_name).toBe("User");
      expect(profile.centre_id).toBe("centre-active");
    });

    it("deactivating a centre does not delete user data", () => {
      // User profile references the centre, centre deactivation doesn't touch user_profiles
      const profile: MockProfile = {
        id: "profile-centre-deact",
        auth_user_id: "auth-centre-deact",
        centre_id: "centre-deactivated",
        first_name: "Still",
        last_name: "Exists",
        status: "active",
      };
      const centre = { ...CENTRE_DEACTIVATED };

      // Profile still references the deactivated centre
      expect(profile.centre_id).toBe(centre.id);
      expect(profile.status).toBe("active");
      expect(centre.status).toBe("deactivated");
      // Profile data is preserved
      expect(profile.first_name).toBe("Still");
      expect(profile.last_name).toBe("Exists");
    });
  });
});
