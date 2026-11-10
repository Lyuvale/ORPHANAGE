import { describe, it, expect } from "vitest";
import {
  createCentreNeedSchema,
  updateCentreNeedSchema,
} from "@/lib/centre-site/centre-needs.validation";

describe("Centre Needs — validation", () => {
  it("accepts a valid create payload", () => {
    const parsed = createCentreNeedSchema.safeParse({
      title: "School uniforms",
      description: "Uniforms for 20 children",
      image_url: "https://cdn.example.com/uniform.jpg",
      target_amount: 1000000,
      is_public: true,
      sort_order: 1,
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.title).toBe("School uniforms");
      expect(parsed.data.target_amount).toBe(1000000);
    }
  });

  it("coerces a numeric string target amount", () => {
    const parsed = createCentreNeedSchema.safeParse({
      title: "Food",
      target_amount: "250000.5",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.target_amount).toBe(250000.5);
  });

  it("rejects zero, negative and non-numeric amounts", () => {
    for (const target_amount of [0, -1, "abc", NaN]) {
      const parsed = createCentreNeedSchema.safeParse({
        title: "Food",
        target_amount,
      });
      expect(parsed.success).toBe(false);
    }
  });

  it("rejects an empty or over-long title", () => {
    expect(
      createCentreNeedSchema.safeParse({ title: "   ", target_amount: 10 })
        .success,
    ).toBe(false);
    expect(
      createCentreNeedSchema.safeParse({
        title: "x".repeat(201),
        target_amount: 10,
      }).success,
    ).toBe(false);
  });

  it("turns an empty image URL into null", () => {
    const parsed = createCentreNeedSchema.safeParse({
      title: "Food",
      target_amount: 10,
      image_url: "",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.image_url).toBeNull();
  });

  it("rejects an invalid image URL", () => {
    const parsed = createCentreNeedSchema.safeParse({
      title: "Food",
      target_amount: 10,
      image_url: "not-a-url",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects unknown status values", () => {
    const parsed = createCentreNeedSchema.safeParse({
      title: "Food",
      target_amount: 10,
      status: "deleted",
    });
    expect(parsed.success).toBe(false);
  });

  it("requires at least one field on update", () => {
    expect(updateCentreNeedSchema.safeParse({}).success).toBe(false);
  });

  it("accepts a partial update", () => {
    const parsed = updateCentreNeedSchema.safeParse({ is_public: false });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.is_public).toBe(false);
  });
});
