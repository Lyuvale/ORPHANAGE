import { describe, it, expect } from "vitest";
import {
  createUserProfileSchema,
  updateUserProfileSchema,
} from "@/lib/users/user-profile.validation";

describe("User Profile Validation", () => {
  describe("createUserProfileSchema", () => {
    const validProfile = {
      auth_user_id: "11111111-1111-1111-1111-111111111111",
      centre_id: "22222222-2222-2222-2222-222222222222",
      first_name: "John",
      last_name: "Doe",
      phone: "+234-801-234-5678",
      email: "john.doe@example.com",
    };

    it("accepts a valid user profile", () => {
      const result = createUserProfileSchema.safeParse(validProfile);
      expect(result.success).toBe(true);
    });

    it("requires auth_user_id", () => {
      const result = createUserProfileSchema.safeParse({
        centre_id: "22222222-2222-2222-2222-222222222222",
        first_name: "John",
        last_name: "Doe",
      });
      expect(result.success).toBe(false);
    });

    it("requires valid UUID for auth_user_id", () => {
      const result = createUserProfileSchema.safeParse({
        auth_user_id: "not-a-uuid",
        centre_id: "22222222-2222-2222-2222-222222222222",
        first_name: "John",
        last_name: "Doe",
      });
      expect(result.success).toBe(false);
    });

    it("requires centre_id", () => {
      const result = createUserProfileSchema.safeParse({
        auth_user_id: "11111111-1111-1111-1111-111111111111",
        first_name: "John",
        last_name: "Doe",
      });
      expect(result.success).toBe(false);
    });

    it("requires valid UUID for centre_id", () => {
      const result = createUserProfileSchema.safeParse({
        auth_user_id: "11111111-1111-1111-1111-111111111111",
        centre_id: "not-a-uuid",
        first_name: "John",
        last_name: "Doe",
      });
      expect(result.success).toBe(false);
    });

    it("requires first_name", () => {
      const result = createUserProfileSchema.safeParse({
        auth_user_id: "11111111-1111-1111-1111-111111111111",
        centre_id: "22222222-2222-2222-2222-222222222222",
        last_name: "Doe",
      });
      expect(result.success).toBe(false);
    });

    it("requires last_name", () => {
      const result = createUserProfileSchema.safeParse({
        auth_user_id: "11111111-1111-1111-1111-111111111111",
        centre_id: "22222222-2222-2222-2222-222222222222",
        first_name: "John",
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty first_name", () => {
      const result = createUserProfileSchema.safeParse({
        auth_user_id: "11111111-1111-1111-1111-111111111111",
        centre_id: "22222222-2222-2222-2222-222222222222",
        first_name: "",
        last_name: "Doe",
      });
      expect(result.success).toBe(false);
    });

    it("accepts optional middle_name", () => {
      const result = createUserProfileSchema.safeParse({
        ...validProfile,
        middle_name: "Michael",
      });
      expect(result.success).toBe(true);
    });

    it("accepts missing optional fields", () => {
      const result = createUserProfileSchema.safeParse({
        auth_user_id: "11111111-1111-1111-1111-111111111111",
        centre_id: "22222222-2222-2222-2222-222222222222",
        first_name: "Jane",
        last_name: "Smith",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.phone).toBeUndefined();
        expect(result.data.email).toBeUndefined();
        expect(result.data.middle_name).toBeUndefined();
      }
    });

    it("accepts valid status", () => {
      for (const status of ["active", "deactivated"]) {
        const result = createUserProfileSchema.safeParse({
          ...validProfile,
          status,
        });
        expect(result.success).toBe(true);
      }
    });

    it("rejects invalid status", () => {
      const result = createUserProfileSchema.safeParse({
        ...validProfile,
        status: "deleted",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid email", () => {
      const result = createUserProfileSchema.safeParse({
        ...validProfile,
        email: "not-an-email",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateUserProfileSchema", () => {
    it("accepts partial updates", () => {
      const result = updateUserProfileSchema.safeParse({ first_name: "Updated" });
      expect(result.success).toBe(true);
    });

    it("accepts empty update", () => {
      const result = updateUserProfileSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("allows changing centre_id", () => {
      const result = updateUserProfileSchema.safeParse({
        centre_id: "33333333-3333-3333-3333-333333333333",
      });
      expect(result.success).toBe(true);
    });

    it("allows changing status", () => {
      const result = updateUserProfileSchema.safeParse({ status: "deactivated" });
      expect(result.success).toBe(true);
    });

    it("rejects invalid status", () => {
      const result = updateUserProfileSchema.safeParse({ status: "invalid" });
      expect(result.success).toBe(false);
    });

    it("rejects invalid centre_id UUID", () => {
      const result = updateUserProfileSchema.safeParse({
        centre_id: "not-a-uuid",
      });
      expect(result.success).toBe(false);
    });
  });
});
