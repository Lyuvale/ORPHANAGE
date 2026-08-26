import { describe, it, expect, beforeEach } from "vitest";
import {
  createChildSchema,
  updateChildSchema,
  updateChildStatusSchema,
  childSearchSchema,
  cleanChildInput,
} from "@/lib/children/child.validation";
import { CHILD_STATUSES, CHILD_GENDERS } from "@/types/child";

// ─── Create Child Schema ─────────────────────────────────────────────────────

describe("createChildSchema", () => {
  const validInput = {
    centre_id: "123e4567-e89b-12d3-a456-426614174000",
    first_name: "Amina",
    last_name: "Okafor",
    date_of_birth: "2015-06-15",
    gender: "female" as const,
    admission_date: "2024-01-15",
  };

  it("accepts valid minimal input", () => {
    const result = createChildSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("accepts valid full input with optional fields", () => {
    const result = createChildSchema.safeParse({
      ...validInput,
      middle_name: "Blessing",
      preferred_name: "Ami",
      nationality: "Nigerian",
      metadata: { source: "referral" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing centre_id", () => {
    const { centre_id: _, ...rest } = validInput;
    const result = createChildSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects invalid centre_id", () => {
    const result = createChildSchema.safeParse({
      ...validInput,
      centre_id: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing first_name", () => {
    const { first_name: _, ...rest } = validInput;
    const result = createChildSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects empty first_name", () => {
    const result = createChildSchema.safeParse({
      ...validInput,
      first_name: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing last_name", () => {
    const { last_name: _, ...rest } = validInput;
    const result = createChildSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects missing date_of_birth", () => {
    const { date_of_birth: _, ...rest } = validInput;
    const result = createChildSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects future date_of_birth", () => {
    const result = createChildSchema.safeParse({
      ...validInput,
      date_of_birth: "2030-01-01",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing gender", () => {
    const { gender: _, ...rest } = validInput;
    const result = createChildSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects invalid gender", () => {
    const result = createChildSchema.safeParse({
      ...validInput,
      gender: "unknown",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid gender values", () => {
    for (const gender of CHILD_GENDERS) {
      const result = createChildSchema.safeParse({ ...validInput, gender });
      expect(result.success).toBe(true);
    }
  });

  it("rejects missing admission_date", () => {
    const { admission_date: _, ...rest } = validInput;
    const result = createChildSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects future admission_date", () => {
    const result = createChildSchema.safeParse({
      ...validInput,
      admission_date: "2030-01-01",
    });
    expect(result.success).toBe(false);
  });

  it("trims whitespace from name fields", () => {
    const result = createChildSchema.safeParse({
      ...validInput,
      first_name: "  Amina  ",
      last_name: "  Okafor  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.first_name).toBe("Amina");
      expect(result.data.last_name).toBe("Okafor");
    }
  });
});

// ─── Update Child Schema ─────────────────────────────────────────────────────

describe("updateChildSchema", () => {
  it("accepts valid partial update", () => {
    const result = updateChildSchema.safeParse({ first_name: "New Name" });
    expect(result.success).toBe(true);
  });

  it("accepts multiple fields", () => {
    const result = updateChildSchema.safeParse({
      first_name: "New",
      last_name: "Name",
      gender: "male",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty update", () => {
    const result = updateChildSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects invalid gender", () => {
    const result = updateChildSchema.safeParse({ gender: "invalid" });
    expect(result.success).toBe(false);
  });

  it("rejects future date_of_birth", () => {
    const result = updateChildSchema.safeParse({
      date_of_birth: "2030-01-01",
    });
    expect(result.success).toBe(false);
  });

  it("allows null for optional fields", () => {
    const result = updateChildSchema.safeParse({
      middle_name: null,
      preferred_name: null,
      nationality: null,
    });
    expect(result.success).toBe(true);
  });
});

// ─── Update Status Schema ────────────────────────────────────────────────────

describe("updateChildStatusSchema", () => {
  it("accepts valid status", () => {
    const result = updateChildStatusSchema.safeParse({
      new_status: "transferred",
    });
    expect(result.success).toBe(true);
  });

  it("accepts all valid statuses", () => {
    for (const status of CHILD_STATUSES) {
      const result = updateChildStatusSchema.safeParse({ new_status: status });
      expect(result.success).toBe(true);
    }
  });

  it("accepts status with reason", () => {
    const result = updateChildStatusSchema.safeParse({
      new_status: "graduated",
      reason: "Completed programme",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = updateChildStatusSchema.safeParse({
      new_status: "invalid_status",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing status", () => {
    const result = updateChildStatusSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ─── Search Schema ───────────────────────────────────────────────────────────

describe("childSearchSchema", () => {
  it("accepts empty input (all defaults)", () => {
    const result = childSearchSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(50);
      expect(result.data.offset).toBe(0);
    }
  });

  it("parses status filter", () => {
    const result = childSearchSchema.safeParse({ status: "active" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("active");
    }
  });

  it("parses search term", () => {
    const result = childSearchSchema.safeParse({ search: "amina" });
    expect(result.success).toBe(true);
  });

  it("clamps limit to max 100", () => {
    const result = childSearchSchema.safeParse({ limit: "200" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(100);
    }
  });

  it("clamps limit to min 1", () => {
    const result = childSearchSchema.safeParse({ limit: "0" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(1);
    }
  });

  it("defaults limit to 50", () => {
    const result = childSearchSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(50);
    }
  });

  it("defaults offset to 0", () => {
    const result = childSearchSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.offset).toBe(0);
    }
  });
});

// ─── Clean Input ─────────────────────────────────────────────────────────────

describe("cleanChildInput", () => {
  it("converts empty strings to null", () => {
    const result = cleanChildInput({
      first_name: "Amina",
      middle_name: "",
      nationality: "",
    });
    expect(result.first_name).toBe("Amina");
    expect(result.middle_name).toBeNull();
    expect(result.nationality).toBeNull();
  });

  it("preserves non-empty values", () => {
    const result = cleanChildInput({
      first_name: "Amina",
      middle_name: "Blessing",
    });
    expect(result.first_name).toBe("Amina");
    expect(result.middle_name).toBe("Blessing");
  });
});
