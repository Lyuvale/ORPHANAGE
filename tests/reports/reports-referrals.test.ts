import { describe, it, expect } from "vitest";
import { referralsDetailRows, referralsByStatusRows } from "@/lib/reports/referrals";
import type { Referral } from "@/types/referral";

describe("Referrals report row builders", () => {
  const referral: Referral = {
    id: "1",
    centre_id: "c1",
    reference_number: "REF-1",
    child_first_name: "Jane",
    child_middle_name: "K",
    child_last_name: "Doe",
    child_date_of_birth: "2015-01-01",
    child_gender: "female",
    child_nationality: "TZ",
    source: "hospital",
    priority: "high",
    status: "under_review",
    referrer_name: "Dr X",
    referrer_org: "Hospital",
    referrer_contact: "555",
    reason: "sensitive reason text",
    notes: "sensitive notes",
    submitted_by: "u1",
    submitted_at: "2026-01-01",
    reviewed_by: null,
    reviewed_at: null,
    metadata: null,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  };

  it("builds detail rows with child name but no sensitive narrative", () => {
    const rows = referralsDetailRows([referral]);
    expect(rows[0].reference).toBe("REF-1");
    expect(rows[0].child).toBe("Jane K Doe");
    expect(rows[0].referral_type).toBe("Hospital");
    expect(rows[0].status).toBe("Under Review");
    const keys = Object.keys(rows[0]);
    expect(keys).not.toContain("reason");
    expect(keys).not.toContain("notes");
    expect(keys).not.toContain("referrer_contact");
  });

  it("groups referrals by status", () => {
    const rows = referralsByStatusRows([
      referral,
      { ...referral, id: "2", reference_number: "REF-2", status: "rejected" },
      { ...referral, id: "3", reference_number: "REF-3", status: "under_review" },
    ]);
    expect(rows).toEqual([
      { status: "Under Review", count: 2 },
      { status: "Rejected", count: 1 },
    ]);
  });
});