import { describe, it, expect } from "vitest";
import { profilesRows, supportNeedsRows, goalsRows } from "@/lib/reports/education";
import { makeAdmin, centreFilter } from "./mock-admin";

const CENTRE = "centre-1";

describe("Education report row builders", () => {
  it("builds education profile rows scoped to the centre", async () => {
    const { admin, calls } = makeAdmin({
      children: [{ id: "c1", first_name: "Jane", last_name: "Doe", reference_number: "CH-1" }],
      education_profiles: [
        {
          child_id: "c1",
          education_status: "ATTENDING",
          school_name: "St. Mary's",
          education_level: "Primary 5",
          general_status: "OK",
        },
      ],
    });
    const rows = await profilesRows(admin as never, CENTRE);
    expect(centreFilter(calls, "education_profiles")).toBe(CENTRE);
    expect(rows[0].child).toBe("Jane Doe (CH-1)");
    expect(rows[0].school).toBe("St. Mary's");
    expect(rows[0].status).toBe("Attending");
  });

  it("builds support need rows with display labels", async () => {
    const { admin } = makeAdmin({
      children: [{ id: "c1", first_name: "Jane", last_name: "Doe", reference_number: "CH-1" }],
      education_support_needs: [
        {
          child_id: "c1",
          support_type: "BOOKS",
          description: "Maths books",
          identified_date: "2026-01-01",
          priority: "HIGH",
          status: "IN_PROGRESS",
        },
      ],
    });
    const rows = await supportNeedsRows(admin as never, CENTRE);
    expect(rows[0].need_type).toBe("Books");
    expect(rows[0].priority).toBe("High");
    expect(rows[0].status).toBe("In Progress");
  });

  it("builds goal rows with display labels", async () => {
    const { admin } = makeAdmin({
      children: [{ id: "c1", first_name: "Jane", last_name: "Doe", reference_number: "CH-1" }],
      education_goals: [
        {
          child_id: "c1",
          title: "Improve reading",
          description: "Daily reading practice",
          start_date: "2026-01-01",
          target_date: "2026-06-01",
          status: "IN_PROGRESS",
        },
      ],
    });
    const rows = await goalsRows(admin as never, CENTRE);
    expect(rows[0].goal).toBe("Improve reading");
    expect(rows[0].status).toBe("In Progress");
  });
});