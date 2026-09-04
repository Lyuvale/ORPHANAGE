import { describe, it, expect } from "vitest";
import { PERMISSIONS, ROLE_PERMISSIONS } from "@/types/role";

describe("Case & Safeguarding Permissions", () => {
  describe("Permission Constants", () => {
    it("defines case permissions", () => {
      expect(PERMISSIONS.CASES_VIEW).toBe("cases.view");
      expect(PERMISSIONS.CASES_CREATE).toBe("cases.create");
      expect(PERMISSIONS.CASES_UPDATE).toBe("cases.update");
      expect(PERMISSIONS.CASES_STATUS_UPDATE).toBe("cases.status.update");
      expect(PERMISSIONS.CASES_CLOSE).toBe("cases.close");
    });

    it("defines assessment permissions", () => {
      expect(PERMISSIONS.CASES_ASSESSMENTS_VIEW).toBe("cases.assessments.view");
      expect(PERMISSIONS.CASES_ASSESSMENTS_CREATE).toBe("cases.assessments.create");
      expect(PERMISSIONS.CASES_ASSESSMENTS_UPDATE).toBe("cases.assessments.update");
    });

    it("defines case plan permissions", () => {
      expect(PERMISSIONS.CASES_PLANS_VIEW).toBe("cases.plans.view");
      expect(PERMISSIONS.CASES_PLANS_CREATE).toBe("cases.plans.create");
      expect(PERMISSIONS.CASES_PLANS_UPDATE).toBe("cases.plans.update");
      expect(PERMISSIONS.CASES_PLANS_APPROVE).toBe("cases.plans.approve");
    });

    it("defines case note permissions", () => {
      expect(PERMISSIONS.CASES_NOTES_VIEW).toBe("cases.notes.view");
      expect(PERMISSIONS.CASES_NOTES_CREATE).toBe("cases.notes.create");
    });

    it("defines intervention permissions", () => {
      expect(PERMISSIONS.CASES_INTERVENTIONS_VIEW).toBe("cases.interventions.view");
      expect(PERMISSIONS.CASES_INTERVENTIONS_CREATE).toBe("cases.interventions.create");
      expect(PERMISSIONS.CASES_INTERVENTIONS_UPDATE).toBe("cases.interventions.update");
    });

    it("defines case document permissions", () => {
      expect(PERMISSIONS.CASES_DOCUMENTS_VIEW).toBe("cases.documents.view");
      expect(PERMISSIONS.CASES_DOCUMENTS_UPLOAD).toBe("cases.documents.upload");
      expect(PERMISSIONS.CASES_DOCUMENTS_DOWNLOAD).toBe("cases.documents.download");
      expect(PERMISSIONS.CASES_DOCUMENTS_DELETE).toBe("cases.documents.delete");
    });

    it("defines safeguarding core permissions", () => {
      expect(PERMISSIONS.SAFEGUARDING_VIEW).toBe("safeguarding.view");
      expect(PERMISSIONS.SAFEGUARDING_CREATE).toBe("safeguarding.create");
      expect(PERMISSIONS.SAFEGUARDING_UPDATE).toBe("safeguarding.update");
      expect(PERMISSIONS.SAFEGUARDING_STATUS_UPDATE).toBe("safeguarding.status.update");
      expect(PERMISSIONS.SAFEGUARDING_ESCALATE).toBe("safeguarding.escalate");
    });

    it("defines safeguarding action permissions", () => {
      expect(PERMISSIONS.SAFEGUARDING_ACTIONS_VIEW).toBe("safeguarding.actions.view");
      expect(PERMISSIONS.SAFEGUARDING_ACTIONS_CREATE).toBe("safeguarding.actions.create");
      expect(PERMISSIONS.SAFEGUARDING_ACTIONS_UPDATE).toBe("safeguarding.actions.update");
    });

    it("defines safeguarding document permissions", () => {
      expect(PERMISSIONS.SAFEGUARDING_DOCUMENTS_VIEW).toBe("safeguarding.documents.view");
      expect(PERMISSIONS.SAFEGUARDING_DOCUMENTS_UPLOAD).toBe("safeguarding.documents.upload");
      expect(PERMISSIONS.SAFEGUARDING_DOCUMENTS_DOWNLOAD).toBe("safeguarding.documents.download");
      expect(PERMISSIONS.SAFEGUARDING_DOCUMENTS_DELETE).toBe("safeguarding.documents.delete");
    });

    it("defines safeguarding escalation permissions", () => {
      expect(PERMISSIONS.SAFEGUARDING_ESCALATIONS_VIEW).toBe("safeguarding.escalations.view");
      expect(PERMISSIONS.SAFEGUARDING_ESCALATIONS_ACKNOWLEDGE).toBe("safeguarding.escalations.acknowledge");
      expect(PERMISSIONS.SAFEGUARDING_ESCALATIONS_RESOLVE).toBe("safeguarding.escalations.resolve");
    });
  });

  describe("Role-Permission Mappings", () => {
    it("CENTRE_MANAGER has all case permissions", () => {
      const perms = ROLE_PERMISSIONS.CENTRE_MANAGER;
      expect(perms).toContain("cases.view");
      expect(perms).toContain("cases.create");
      expect(perms).toContain("cases.update");
      expect(perms).toContain("cases.status.update");
      expect(perms).toContain("cases.close");
      expect(perms).toContain("cases.assessments.view");
      expect(perms).not.toContain("cases.assessments.create");
      expect(perms).not.toContain("cases.assessments.update");
      expect(perms).toContain("cases.plans.view");
      expect(perms).toContain("cases.plans.create");
      expect(perms).toContain("cases.plans.update");
      expect(perms).toContain("cases.plans.approve");
      expect(perms).toContain("cases.notes.view");
      expect(perms).toContain("cases.notes.create");
      expect(perms).toContain("cases.interventions.view");
      expect(perms).toContain("cases.interventions.create");
      expect(perms).toContain("cases.interventions.update");
      expect(perms).toContain("cases.documents.view");
      expect(perms).toContain("cases.documents.upload");
      expect(perms).toContain("cases.documents.download");
      expect(perms).toContain("cases.documents.delete");
    });

    it("CENTRE_MANAGER has all safeguarding permissions", () => {
      const perms = ROLE_PERMISSIONS.CENTRE_MANAGER;
      expect(perms).toContain("safeguarding.view");
      expect(perms).toContain("safeguarding.create");
      expect(perms).toContain("safeguarding.update");
      expect(perms).toContain("safeguarding.status.update");
      expect(perms).toContain("safeguarding.escalate");
      expect(perms).toContain("safeguarding.actions.view");
      expect(perms).toContain("safeguarding.actions.create");
      expect(perms).toContain("safeguarding.actions.update");
      expect(perms).toContain("safeguarding.documents.view");
      expect(perms).toContain("safeguarding.documents.upload");
      expect(perms).toContain("safeguarding.documents.download");
      expect(perms).toContain("safeguarding.documents.delete");
      expect(perms).toContain("safeguarding.escalations.view");
      expect(perms).toContain("safeguarding.escalations.acknowledge");
      expect(perms).toContain("safeguarding.escalations.resolve");
    });

    it("SOCIAL_WORKER has all case permissions", () => {
      const perms = ROLE_PERMISSIONS.SOCIAL_WORKER;
      expect(perms).toContain("cases.view");
      expect(perms).toContain("cases.create");
      expect(perms).toContain("cases.update");
      expect(perms).toContain("cases.status.update");
      expect(perms).toContain("cases.assessments.view");
      expect(perms).toContain("cases.assessments.create");
      expect(perms).toContain("cases.plans.view");
      expect(perms).toContain("cases.plans.create");
      expect(perms).toContain("cases.plans.update");
      expect(perms).toContain("cases.notes.view");
      expect(perms).toContain("cases.notes.create");
      expect(perms).toContain("cases.interventions.view");
      expect(perms).toContain("cases.interventions.create");
      expect(perms).toContain("cases.interventions.update");
    });

    it("SOCIAL_WORKER has all safeguarding permissions", () => {
      const perms = ROLE_PERMISSIONS.SOCIAL_WORKER;
      expect(perms).toContain("safeguarding.view");
      expect(perms).toContain("safeguarding.create");
      expect(perms).toContain("safeguarding.update");
      expect(perms).toContain("safeguarding.status.update");
      expect(perms).toContain("safeguarding.escalate");
      expect(perms).toContain("safeguarding.actions.view");
      expect(perms).toContain("safeguarding.actions.create");
      expect(perms).toContain("safeguarding.actions.update");
    });

    it("CAREGIVER has no case permissions (confidential cases forbidden)", () => {
      const perms = ROLE_PERMISSIONS.CAREGIVER;
      expect(perms).not.toContain("cases.view");
      expect(perms).not.toContain("cases.create");
      expect(perms).not.toContain("cases.update");
      expect(perms).not.toContain("cases.status.update");
    });

    it("CAREGIVER has no safeguarding permissions (restricted records forbidden)", () => {
      const perms = ROLE_PERMISSIONS.CAREGIVER;
      expect(perms).not.toContain("safeguarding.view");
      expect(perms).not.toContain("safeguarding.create");
      expect(perms).not.toContain("safeguarding.update");
    });

    it("RECORDS_OFFICER has cases.documents permissions", () => {
      const perms = ROLE_PERMISSIONS.RECORDS_OFFICER;
      expect(perms).toContain("cases.view");
      expect(perms).toContain("cases.documents.view");
      expect(perms).toContain("cases.documents.upload");
      expect(perms).toContain("cases.documents.download");
      expect(perms).not.toContain("cases.create");
      expect(perms).not.toContain("cases.assessments.create");
    });

    it("RECORDS_OFFICER has safeguarding.documents permissions", () => {
      const perms = ROLE_PERMISSIONS.RECORDS_OFFICER;
      expect(perms).toContain("safeguarding.view");
      expect(perms).toContain("safeguarding.documents.view");
      expect(perms).toContain("safeguarding.documents.upload");
      expect(perms).toContain("safeguarding.documents.download");
      expect(perms).not.toContain("safeguarding.create");
    });

    it("ACCOUNTANT_BURSAR does not have cases permissions", () => {
      const perms = ROLE_PERMISSIONS.ACCOUNTANT_BURSAR;
      expect(perms).not.toContain("cases.view");
      expect(perms).not.toContain("safeguarding.view");
    });
  });

  describe("Permission Count", () => {
    it("has 21 case permissions", () => {
      const casePerms = Object.values(PERMISSIONS).filter((p) => p.startsWith("cases."));
      expect(casePerms).toHaveLength(21);
    });

    it("has 15 safeguarding permissions", () => {
      const sgPerms = Object.values(PERMISSIONS).filter((p) => p.startsWith("safeguarding."));
      expect(sgPerms).toHaveLength(15);
    });

    it("has 36 total case+safeguarding permissions", () => {
      const allPerms = Object.values(PERMISSIONS).filter(
        (p) => p.startsWith("cases.") || p.startsWith("safeguarding."),
      );
      expect(allPerms).toHaveLength(36);
    });
  });
});
