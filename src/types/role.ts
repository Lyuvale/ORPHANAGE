export const CENTRE_ROLES = [
  "CENTRE_MANAGER",
  "SOCIAL_WORKER",
  "CAREGIVER",
  "RECORDS_OFFICER",
  "ACCOUNTANT_BURSAR",
] as const;

export type CentreRole = (typeof CENTRE_ROLES)[number];

export interface Role {
  id: string;
  name: CentreRole;
  description: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  module: string;
  action: string;
  description: string | null;
  created_at: string;
}

export interface RolePermission {
  role_id: string;
  permission_id: string;
  created_at: string;
}

export type UserRoleStatus = "active" | "revoked";

export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  centre_id: string;
  assigned_by: string | null;
  assigned_at: string;
  status: UserRoleStatus;
}

export interface RoleHistoryEntry {
  id: string;
  user_id: string;
  centre_id: string;
  previous_role_id: string | null;
  new_role_id: string;
  changed_by: string | null;
  changed_at: string;
  reason: string | null;
}

export const USER_ROLE_STATUSES = ["active", "revoked"] as const;

/**
 * A permission string in the format "module.action".
 * Example: "children.view", "finance.approve"
 */
export type PermissionString = `${string}.${string}`;

/**
 * The permission catalogue — expand as new modules are added.
 * Keep this in sync with the permissions seed in the migration.
 */
export const PERMISSIONS = {
  CHILDREN_VIEW: "children.view" as const,
  CHILDREN_CREATE: "children.create" as const,
  CHILDREN_UPDATE: "children.update" as const,
  CHILDREN_STATUS_UPDATE: "children.status.update" as const,
  CHILDREN_ARCHIVE: "children.archive" as const,

  CASES_VIEW: "cases.view" as const,
  CASES_CREATE: "cases.create" as const,
  CASES_UPDATE: "cases.update" as const,
  CASES_STATUS_UPDATE: "cases.status.update" as const,
  CASES_CLOSE: "cases.close" as const,
  CASES_ASSESSMENTS_VIEW: "cases.assessments.view" as const,
  CASES_ASSESSMENTS_CREATE: "cases.assessments.create" as const,
  CASES_ASSESSMENTS_UPDATE: "cases.assessments.update" as const,
  CASES_PLANS_VIEW: "cases.plans.view" as const,
  CASES_PLANS_CREATE: "cases.plans.create" as const,
  CASES_PLANS_UPDATE: "cases.plans.update" as const,
  CASES_PLANS_APPROVE: "cases.plans.approve" as const,
  CASES_NOTES_VIEW: "cases.notes.view" as const,
  CASES_NOTES_CREATE: "cases.notes.create" as const,
  CASES_INTERVENTIONS_VIEW: "cases.interventions.view" as const,
  CASES_INTERVENTIONS_CREATE: "cases.interventions.create" as const,
  CASES_INTERVENTIONS_UPDATE: "cases.interventions.update" as const,
  CASES_DOCUMENTS_VIEW: "cases.documents.view" as const,
  CASES_DOCUMENTS_UPLOAD: "cases.documents.upload" as const,
  CASES_DOCUMENTS_DOWNLOAD: "cases.documents.download" as const,
  CASES_DOCUMENTS_DELETE: "cases.documents.delete" as const,

  FINANCE_VIEW: "finance.view" as const,
  FINANCE_CREATE: "finance.create" as const,
  FINANCE_APPROVE: "finance.approve" as const,

  REPORTS_VIEW: "reports.view" as const,
  REPORTS_EXPORT: "reports.export" as const,

  DOCUMENTS_VIEW: "documents.view" as const,
  DOCUMENTS_UPLOAD: "documents.upload" as const,
  DOCUMENTS_DOWNLOAD: "documents.download" as const,
  DOCUMENTS_DELETE: "documents.delete" as const,

  REFERRALS_VIEW: "referrals.view" as const,
  REFERRALS_CREATE: "referrals.create" as const,
  REFERRALS_UPDATE: "referrals.update" as const,
  REFERRALS_REVIEW: "referrals.review" as const,
  REFERRALS_APPROVE: "referrals.approve" as const,
  REFERRALS_REJECT: "referrals.reject" as const,

  ADMISSIONS_VIEW: "admissions.view" as const,
  ADMISSIONS_CREATE: "admissions.create" as const,
  ADMISSIONS_REVIEW: "admissions.review" as const,

  PLACEMENTS_VIEW: "placements.view" as const,
  PLACEMENTS_CREATE: "placements.create" as const,
  PLACEMENTS_UPDATE: "placements.update" as const,

  SAFEGUARDING_VIEW: "safeguarding.view" as const,
  SAFEGUARDING_CREATE: "safeguarding.create" as const,
  SAFEGUARDING_UPDATE: "safeguarding.update" as const,
  SAFEGUARDING_STATUS_UPDATE: "safeguarding.status.update" as const,
  SAFEGUARDING_ESCALATE: "safeguarding.escalate" as const,
  SAFEGUARDING_ACTIONS_VIEW: "safeguarding.actions.view" as const,
  SAFEGUARDING_ACTIONS_CREATE: "safeguarding.actions.create" as const,
  SAFEGUARDING_ACTIONS_UPDATE: "safeguarding.actions.update" as const,
  SAFEGUARDING_DOCUMENTS_VIEW: "safeguarding.documents.view" as const,
  SAFEGUARDING_DOCUMENTS_UPLOAD: "safeguarding.documents.upload" as const,
  SAFEGUARDING_DOCUMENTS_DOWNLOAD: "safeguarding.documents.download" as const,
  SAFEGUARDING_DOCUMENTS_DELETE: "safeguarding.documents.delete" as const,
  SAFEGUARDING_ESCALATIONS_VIEW: "safeguarding.escalations.view" as const,
  SAFEGUARDING_ESCALATIONS_ACKNOWLEDGE: "safeguarding.escalations.acknowledge" as const,
  SAFEGUARDING_ESCALATIONS_RESOLVE: "safeguarding.escalations.resolve" as const,

  STAFF_VIEW: "staff.view" as const,
  STAFF_CREATE: "staff.create" as const,
  STAFF_UPDATE: "staff.update" as const,
  STAFF_ASSIGN_ROLES: "staff.assign_roles" as const,

  DAILY_CARE_VIEW: "daily_care.view" as const,
  DAILY_CARE_CREATE: "daily_care.create" as const,
  DAILY_CARE_UPDATE: "daily_care.update" as const,
  DAILY_CARE_CHECK_IN: "daily_care.check_in" as const,
  DAILY_CARE_CHECK_OUT: "daily_care.check_out" as const,
  DAILY_CARE_NOTES_CREATE: "daily_care.notes.create" as const,
  DAILY_CARE_NOTES_AMEND: "daily_care.notes.amend" as const,
  DAILY_CARE_MEALS_CREATE: "daily_care.meals.create" as const,
  DAILY_CARE_FOLLOWUPS_CREATE: "daily_care.followups.create" as const,
  DAILY_CARE_FOLLOWUPS_UPDATE: "daily_care.followups.update" as const,

  PRESENCE_VIEW: "presence.view" as const,
  PRESENCE_CREATE: "presence.create" as const,
  PRESENCE_UPDATE: "presence.update" as const,
  PRESENCE_CHECK_IN: "presence.check_in" as const,
  PRESENCE_CHECK_OUT: "presence.check_out" as const,
  PRESENCE_OFF_SITE: "presence.off_site" as const,
  PRESENCE_DAILY_SUMMARY: "presence.daily_summary" as const,

  GUARDIANS_VIEW: "guardians.view" as const,
  GUARDIANS_CREATE: "guardians.create" as const,
  GUARDIANS_UPDATE: "guardians.update" as const,
  GUARDIANS_DEACTIVATE: "guardians.deactivate" as const,
  GUARDIANS_RELATIONSHIP_MANAGE: "guardians.relationship.manage" as const,
  GUARDIANS_DOCUMENTS_VIEW: "guardians.documents.view" as const,
  GUARDIANS_DOCUMENTS_UPLOAD: "guardians.documents.upload" as const,
  GUARDIANS_DOCUMENTS_DOWNLOAD: "guardians.documents.download" as const,

  VISITS_VIEW: "visits.view" as const,
  VISITS_CREATE: "visits.create" as const,
  VISITS_UPDATE: "visits.update" as const,
  VISITS_REQUEST: "visits.request" as const,
  VISITS_APPROVE: "visits.approve" as const,
  VISITS_REJECT: "visits.reject" as const,
  VISITS_CHECKIN: "visits.checkin" as const,
  VISITS_CHECKOUT: "visits.checkout" as const,
  VISITS_COMPLETE: "visits.complete" as const,
  VISITS_CANCEL: "visits.cancel" as const,
  VISITS_RESTRICTIONS_VIEW: "visits.restrictions.view" as const,
  VISITS_RESTRICTIONS_MANAGE: "visits.restrictions.manage" as const,
  VISITS_CONTACT_ATTEMPTS_VIEW: "visits.contact_attempts.view" as const,
  VISITS_CONTACT_ATTEMPTS_CREATE: "visits.contact_attempts.create" as const,
} as const;

export const ALL_PERMISSIONS: PermissionString[] = Object.values(PERMISSIONS);

/**
 * Role → Permission defaults (application-level reference).
 * This mirrors the database seed for quick lookups without a DB round-trip.
 */
export const ROLE_PERMISSIONS: Record<CentreRole, readonly PermissionString[]> = {
  CENTRE_MANAGER: [
    "children.view", "children.create", "children.update", "children.status.update", "children.archive",
    "cases.view", "cases.create", "cases.update", "cases.status.update", "cases.close",
    "cases.assessments.view", "cases.assessments.create", "cases.assessments.update",
    "cases.plans.view", "cases.plans.create", "cases.plans.update", "cases.plans.approve",
    "cases.notes.view", "cases.notes.create",
    "cases.interventions.view", "cases.interventions.create", "cases.interventions.update",
    "cases.documents.view", "cases.documents.upload", "cases.documents.download", "cases.documents.delete",
    "finance.view", "finance.approve",
    "reports.view", "reports.export",
    "documents.view", "documents.upload", "documents.download",
    "referrals.view", "referrals.create", "referrals.update", "referrals.review", "referrals.approve", "referrals.reject",
    "admissions.view", "admissions.create", "admissions.review",
    "placements.view", "placements.create", "placements.update",
    "safeguarding.view", "safeguarding.create", "safeguarding.update", "safeguarding.status.update", "safeguarding.escalate",
    "safeguarding.actions.view", "safeguarding.actions.create", "safeguarding.actions.update",
    "safeguarding.documents.view", "safeguarding.documents.upload", "safeguarding.documents.download", "safeguarding.documents.delete",
    "safeguarding.escalations.view", "safeguarding.escalations.acknowledge", "safeguarding.escalations.resolve",
    "staff.view", "staff.create", "staff.update", "staff.assign_roles",
    "daily_care.view", "daily_care.create", "daily_care.update",
    "daily_care.check_in", "daily_care.check_out",
    "daily_care.notes.create", "daily_care.notes.amend",
    "daily_care.meals.create",
    "daily_care.followups.create", "daily_care.followups.update",
    "presence.view", "presence.create", "presence.update",
    "presence.check_in", "presence.check_out", "presence.off_site", "presence.daily_summary",
    "guardians.view", "guardians.create", "guardians.update", "guardians.deactivate",
    "guardians.relationship.manage", "guardians.documents.view", "guardians.documents.upload", "guardians.documents.download",
    "visits.view", "visits.create", "visits.update", "visits.request", "visits.approve", "visits.reject",
    "visits.checkin", "visits.checkout", "visits.complete", "visits.cancel",
    "visits.restrictions.view", "visits.restrictions.manage",
    "visits.contact_attempts.view", "visits.contact_attempts.create",
  ],
  SOCIAL_WORKER: [
    "children.view", "children.create", "children.update", "children.status.update",
    "cases.view", "cases.create", "cases.update", "cases.status.update",
    "cases.assessments.view", "cases.assessments.create", "cases.assessments.update",
    "cases.plans.view", "cases.plans.create", "cases.plans.update",
    "cases.notes.view", "cases.notes.create",
    "cases.interventions.view", "cases.interventions.create", "cases.interventions.update",
    "cases.documents.view", "cases.documents.upload", "cases.documents.download",
    "referrals.view", "referrals.create", "referrals.update", "referrals.review", "referrals.approve", "referrals.reject",
    "admissions.view", "admissions.create", "admissions.review",
    "placements.view", "placements.create", "placements.update",
    "safeguarding.view", "safeguarding.create", "safeguarding.update", "safeguarding.status.update", "safeguarding.escalate",
    "safeguarding.actions.view", "safeguarding.actions.create", "safeguarding.actions.update",
    "safeguarding.documents.view", "safeguarding.documents.upload",
    "safeguarding.escalations.view", "safeguarding.escalations.acknowledge",
    "documents.view", "documents.upload", "documents.download",
    "reports.view",
    "daily_care.view", "daily_care.create", "daily_care.update",
    "daily_care.check_in", "daily_care.check_out",
    "daily_care.notes.create", "daily_care.notes.amend",
    "daily_care.meals.create",
    "daily_care.followups.create", "daily_care.followups.update",
    "presence.view", "presence.create", "presence.update",
    "presence.check_in", "presence.check_out", "presence.off_site", "presence.daily_summary",
    "guardians.view", "guardians.create", "guardians.update",
    "guardians.relationship.manage", "guardians.documents.view", "guardians.documents.upload",
    "visits.view", "visits.create", "visits.update", "visits.request", "visits.approve", "visits.reject",
    "visits.checkin", "visits.checkout", "visits.complete", "visits.cancel",
    "visits.restrictions.view", "visits.restrictions.manage",
    "visits.contact_attempts.view", "visits.contact_attempts.create",
  ],
  CAREGIVER: [
    "children.view",
    "cases.view",
    "safeguarding.view",
    "placements.view",
    "daily_care.view", "daily_care.update",
    "daily_care.check_in", "daily_care.check_out",
    "daily_care.notes.create",
    "daily_care.meals.create",
    "presence.view", "presence.create", "presence.check_in", "presence.check_out",
    "guardians.view",
    "visits.view", "visits.checkin", "visits.checkout",
  ],
  RECORDS_OFFICER: [
    "children.view", "children.create", "children.update", "children.status.update", "children.archive",
    "cases.view", "cases.documents.view", "cases.documents.upload", "cases.documents.download",
    "documents.view", "documents.upload", "documents.download", "documents.delete",
    "reports.view", "reports.export",
    "admissions.view",
    "placements.view", "placements.create", "placements.update",
    "safeguarding.view", "safeguarding.documents.view", "safeguarding.documents.upload", "safeguarding.documents.download",
    "daily_care.view",
    "presence.view",
    "guardians.view", "guardians.create", "guardians.update",
    "guardians.documents.view", "guardians.documents.upload", "guardians.documents.download",
    "visits.view", "visits.restrictions.view", "visits.contact_attempts.view",
  ],
  ACCOUNTANT_BURSAR: [
    "finance.view", "finance.create", "finance.approve",
    "reports.view", "reports.export",
    "children.view",
    "guardians.view",
  ],
};
