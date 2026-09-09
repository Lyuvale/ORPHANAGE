import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROLE_PERMISSIONS } from "@/types/role";

/**
 * ROLE 3 — CAREGIVER (spec: responsibilities & access limits).
 *
 * Sees MY ASSIGNED CHILDREN ONLY: same centre AND actively assigned.
 * Duties: daily care, presence/attendance, meals, hygiene/activities,
 * observations/needs/notes, check-in/out, relevant health/education.
 * Limits: no all-children view, no confidential cases, no restricted
 * safeguarding, no finance/sources/funds/expenses/assets, no users,
 * own centre only.
 */
function src(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf-8");
}

describe("Caregiver static permissions (spec duties)", () => {
  const perms = ROLE_PERMISSIONS.CAREGIVER;

  it("records daily care and presence", () => {
    for (const p of [
      "children.view",
      "daily_care.view",
      "daily_care.create",
      "daily_care.notes.create",
      "daily_care.meals.create",
      "daily_care.check_in",
      "daily_care.check_out",
      "presence.view",
      "presence.create",
      "presence.check_in",
      "presence.check_out",
    ]) {
      expect(perms).toContain(p);
    }
  });

  it("sees relevant health/education for daily care", () => {
    for (const p of [
      "health.emergency.view",
      "health.medications.view",
      "health.medications.administer",
      "education_development.view",
      "visits.view",
      "notifications.view",
    ]) {
      expect(perms).toContain(p);
    }
  });

  it("cannot access confidential cases, restricted safeguarding, staff or finance", () => {
    for (const p of [
      "cases.view",
      "cases.create",
      "safeguarding.view",
      "safeguarding.create",
      "staff.view",
      "staff.create",
      "finance.view",
      "finance.create",
      "finance.approve",
      "resources.manage",
      "resources.assets.manage",
      "audit.view",
    ]) {
      expect(perms).not.toContain(p);
    }
    for (const p of perms) {
      expect(p.startsWith("platform.")).toBe(false);
    }
  });
});

describe("Caregiver migration aligns the database", () => {
  const mig = src("supabase/migrations/20260917000000_role_access_limits.sql");

  it("grants daily_care.create and revokes cases/safeguarding/staff view", () => {
    expect(mig).toContain("CAREGIVER");
    expect(mig).toContain("daily_care");
    expect(mig).toContain("('cases', 'view')");
    expect(mig).toContain("('safeguarding', 'view')");
    expect(mig).toContain("('staff', 'view')");
  });
});

describe("Caregiver assigned-only data enforcement", () => {
  it("assignment scope helper checks same-centre active assignments", () => {
    const svc = src("src/lib/caregivers/caregiver.service.ts");
    expect(svc).toContain("child_caregivers");
    expect(svc).toContain("getActiveCaregiverChildIds");
    expect(svc).toContain("isChildAssignedToCaregiver");
    expect(svc).toContain("caregiverAssignmentScope");
    expect(svc).toContain('"active"');
  });

  it("children list is scoped to assigned children for caregivers", () => {
    const route = src("src/app/api/children/route.ts");
    expect(route).toContain("caregiverAssignmentScope");
    expect(route).toContain("ids: assignedIds");
  });

  it("child detail denies unassigned children for caregivers", () => {
    expect(src("src/app/api/children/[id]/route.ts")).toContain("caregiverAssignmentScope");
  });

  it("caregiver writes (daily care, presence, education) require assignment", () => {
    for (const rel of [
      "src/app/api/daily-care/route.ts",
      "src/app/api/presence/route.ts",
      "src/app/api/education/progress/route.ts",
      "src/app/api/education/attendance/route.ts",
    ]) {
      expect(src(rel)).toContain("caregiverAssignmentScope");
    }
  });

  it("guardian relationships are scoped to assigned children for caregivers", () => {
    expect(src("src/app/api/guardians/relationships/route.ts")).toContain("caregiverAssignmentScope");
    expect(src("src/app/api/guardians/route.ts")).toContain("caregiverAssignmentScope");
  });

  it("assignment management UI is hidden from caregivers", () => {
    const page = src("src/app/(dashboard)/children/[id]/page.tsx");
    expect(page).toContain("staff.assignments.manage");
  });
});

describe("Caregiver assignment dropdown shows caregiver accounts", () => {
  const avail = src("src/app/api/caregivers/available/route.ts");
  const comp = src("src/app/(dashboard)/children/[id]/_components/caregiver-assignment.tsx");

  it("exposes active CAREGIVER users scoped to the own centre", () => {
    expect(avail).toContain("CAREGIVER");
    expect(avail).toContain("staff.assignments.manage");
    expect(avail).toContain("ctx.centre.id");
  });

  it("assignment form lists user accounts with empty-state guidance", () => {
    expect(comp).toContain("/api/caregivers/available");
    expect(comp).toContain("No caregiver accounts yet");
  });
});

describe("Sticky child context across modules", () => {
  const hook = src("src/app/(dashboard)/_components/use-sticky-child.tsx");

  it("remembers the opened child and pre-selects it everywhere", () => {
    expect(hook).toContain("lastChildId");
    expect(hook).toContain("RememberChild");
    expect(hook).toContain("useStickyChild");
  });

  it("child profile remembers; health and education adopt it", () => {
    const profile = src("src/app/(dashboard)/children/[id]/page.tsx");
    expect(profile).toContain("RememberChild");
    for (const rel of [
      "src/app/(dashboard)/health/page.tsx",
      "src/app/(dashboard)/education/profile/page.tsx",
      "src/app/(dashboard)/education/goals/page.tsx",
      "src/app/(dashboard)/education/support-needs/page.tsx",
      "src/app/(dashboard)/education/achievements/page.tsx",
      "src/app/(dashboard)/education/progress/page.tsx",
    ]) {
      expect(src(rel)).toContain("useStickyChild");
    }
  });
});

describe("Caregiver dashboard", () => {
  const dash = src("src/app/(dashboard)/dashboard/page.tsx");

  it("renders a caregiver section with assigned children only", () => {
    expect(dash).toContain("CAREGIVER");
    expect(dash).toContain("Assigned");
  });
});
