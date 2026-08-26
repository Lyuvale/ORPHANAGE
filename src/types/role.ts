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
  CHILDREN_ARCHIVE: "children.archive" as const,

  CASES_VIEW: "cases.view" as const,
  CASES_CREATE: "cases.create" as const,
  CASES_UPDATE: "cases.update" as const,

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

  SAFEGUARDING_VIEW: "safeguarding.view" as const,
  SAFEGUARDING_CREATE: "safeguarding.create" as const,
  SAFEGUARDING_UPDATE: "safeguarding.update" as const,

  STAFF_VIEW: "staff.view" as const,
  STAFF_CREATE: "staff.create" as const,
  STAFF_UPDATE: "staff.update" as const,
  STAFF_ASSIGN_ROLES: "staff.assign_roles" as const,

  DAILY_CARE_VIEW: "daily_care.view" as const,
  DAILY_CARE_UPDATE: "daily_care.update" as const,
  DAILY_CARE_CHECK_IN: "daily_care.check_in" as const,
  DAILY_CARE_CHECK_OUT: "daily_care.check_out" as const,
} as const;

export const ALL_PERMISSIONS: PermissionString[] = Object.values(PERMISSIONS);

/**
 * Role → Permission defaults (application-level reference).
 * This mirrors the database seed for quick lookups without a DB round-trip.
 */
export const ROLE_PERMISSIONS: Record<CentreRole, readonly PermissionString[]> = {
  CENTRE_MANAGER: [
    "children.view", "children.create", "children.update", "children.archive",
    "cases.view", "cases.create", "cases.update",
    "finance.view", "finance.approve",
    "reports.view", "reports.export",
    "documents.view", "documents.upload", "documents.download",
    "referrals.view", "referrals.create", "referrals.update",
    "safeguarding.view", "safeguarding.create", "safeguarding.update",
    "staff.view", "staff.create", "staff.update", "staff.assign_roles",
    "daily_care.view",
  ],
  SOCIAL_WORKER: [
    "children.view", "children.create", "children.update",
    "cases.view", "cases.create", "cases.update",
    "referrals.view", "referrals.create", "referrals.update",
    "safeguarding.view", "safeguarding.create", "safeguarding.update",
    "documents.view", "documents.upload", "documents.download",
    "reports.view",
    "daily_care.view",
  ],
  CAREGIVER: [
    "children.view", "children.update",
    "cases.view",
    "safeguarding.view",
    "daily_care.view", "daily_care.update",
    "daily_care.check_in", "daily_care.check_out",
  ],
  RECORDS_OFFICER: [
    "children.view", "children.create", "children.update", "children.archive",
    "documents.view", "documents.upload", "documents.download", "documents.delete",
    "reports.view", "reports.export",
  ],
  ACCOUNTANT_BURSAR: [
    "finance.view", "finance.create", "finance.approve",
    "reports.view", "reports.export",
    "children.view",
  ],
};
