/**
 * Education Support & Child Development Types
 *
 * Tracks whether a child is attending an external educational
 * institution (and where), plus education support needs, development
 * goals, progress towards goals, and achievements.
 *
 * SECURITY:
 *   - centre_id is always derived server-side, never from client input
 *   - education_development.* permissions are granted granularly and
 *     separately from children.view
 *   - Progress updates, goals, and achievements are historical; records
 *     are NOT silently overwritten (progress is append-only)
 *   - This module records support NEEDS only — it does NOT process
 *     payments, procurement, donations, or inventory transactions
 */

// ─── Education Status ────────────────────────────────────────

export const EDUCATION_STATUSES = [
  "ATTENDING",
  "NOT_ATTENDING",
  "COMPLETED",
  "TEMPORARILY_NOT_ATTENDING",
] as const;

export type EducationStatus = (typeof EDUCATION_STATUSES)[number];

// ─── Support Need Type ───────────────────────────────────────

export const EDUCATION_SUPPORT_TYPES = [
  "BOOKS",
  "UNIFORM",
  "STATIONERY",
  "SCHOOL_BAG",
  "TRANSPORT",
  "SCHOOL_FEES",
  "OTHER",
] as const;

export type EducationSupportType = (typeof EDUCATION_SUPPORT_TYPES)[number];

// ─── Support Need Priority ───────────────────────────────────

export const EDUCATION_SUPPORT_PRIORITIES = [
  "HIGH",
  "MEDIUM",
  "LOW",
] as const;

export type EducationSupportPriority = (typeof EDUCATION_SUPPORT_PRIORITIES)[number];

// ─── Support Need Status ─────────────────────────────────────

export const EDUCATION_SUPPORT_STATUSES = [
  "IDENTIFIED",
  "IN_PROGRESS",
  "SUPPORTED",
  "CLOSED",
] as const;

export type EducationSupportStatus = (typeof EDUCATION_SUPPORT_STATUSES)[number];

// ─── Goal Status ─────────────────────────────────────────────

export const EDUCATION_GOAL_STATUSES = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETED",
] as const;

export type EducationGoalStatus = (typeof EDUCATION_GOAL_STATUSES)[number];

// ─── Progress Status ─────────────────────────────────────────

export const EDUCATION_PROGRESS_STATUSES = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETED",
] as const;

export type EducationProgressStatus = (typeof EDUCATION_PROGRESS_STATUSES)[number];

// ─── Achievement Category ────────────────────────────────────

export const EDUCATION_ACHIEVEMENT_CATEGORIES = [
  "GOAL_COMPLETION",
  "SKILL",
  "TRAINING",
  "CERTIFICATE",
  "EDUCATIONAL",
  "PERSONAL",
  "OTHER",
] as const;

export type EducationAchievementCategory = (typeof EDUCATION_ACHIEVEMENT_CATEGORIES)[number];

// ─── Education Profile ───────────────────────────────────────

export interface EducationProfile {
  id: string;
  centre_id: string;
  child_id: string;
  education_status: EducationStatus;
  school_name: string | null;
  education_level: string | null;
  general_status: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateEducationProfileInput {
  centre_id: string;
  child_id: string;
  education_status?: EducationStatus;
  school_name?: string | null;
  education_level?: string | null;
  general_status?: string | null;
  notes?: string | null;
}

export interface UpdateEducationProfileInput {
  education_status?: EducationStatus;
  school_name?: string | null;
  education_level?: string | null;
  general_status?: string | null;
  notes?: string | null;
}

// ─── Education Support Need ──────────────────────────────────

export interface EducationSupportNeed {
  id: string;
  centre_id: string;
  child_id: string;
  support_type: EducationSupportType;
  description: string | null;
  identified_date: string | null;
  priority: EducationSupportPriority;
  status: EducationSupportStatus;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateEducationSupportNeedInput {
  centre_id: string;
  child_id: string;
  support_type: EducationSupportType;
  description?: string | null;
  identified_date?: string | null;
  priority?: EducationSupportPriority;
  status?: EducationSupportStatus;
  notes?: string | null;
}

export interface UpdateEducationSupportNeedInput {
  support_type?: EducationSupportType;
  description?: string | null;
  identified_date?: string | null;
  priority?: EducationSupportPriority;
  status?: EducationSupportStatus;
  notes?: string | null;
}

// ─── Development Goal ────────────────────────────────────────

export interface EducationGoal {
  id: string;
  centre_id: string;
  child_id: string;
  title: string;
  description: string | null;
  start_date: string | null;
  target_date: string | null;
  status: EducationGoalStatus;
  created_by: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateEducationGoalInput {
  centre_id: string;
  child_id: string;
  title: string;
  description?: string | null;
  start_date?: string | null;
  target_date?: string | null;
  status?: EducationGoalStatus;
}

export interface UpdateEducationGoalInput {
  title?: string;
  description?: string | null;
  start_date?: string | null;
  target_date?: string | null;
  status?: EducationGoalStatus;
}

// ─── Progress Update (append-only) ───────────────────────────

export interface EducationProgress {
  id: string;
  centre_id: string;
  child_id: string;
  goal_id: string;
  progress_date: string;
  progress_status: EducationProgressStatus;
  observation: string | null;
  recorded_by: string;
  created_at: string;
}

export interface CreateEducationProgressInput {
  centre_id: string;
  child_id: string;
  goal_id: string;
  progress_date?: string;
  progress_status?: EducationProgressStatus;
  observation?: string | null;
}

// ─── Achievement ─────────────────────────────────────────────

export interface EducationAchievement {
  id: string;
  centre_id: string;
  child_id: string;
  title: string;
  description: string | null;
  achievement_date: string | null;
  category: EducationAchievementCategory;
  evidence_reference: string | null;
  recorded_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateEducationAchievementInput {
  centre_id: string;
  child_id: string;
  title: string;
  description?: string | null;
  achievement_date?: string | null;
  category?: EducationAchievementCategory;
  evidence_reference?: string | null;
}

// ─── Education & Development Overview ────────────────────────
// A lightweight dashboard summary — never overloads the screen.

export interface EducationOverview {
  profile: {
    education_status: EducationStatus | null;
    school_name: string | null;
  } | null;
  active_support_needs: number;
  high_priority_needs: number;
  active_goals: number;
  completed_goals: number;
  most_recent_progress: string | null;
  recent_achievements_count: number;
}

// ─── Search Filters ──────────────────────────────────────────

export interface EducationSearchFilters {
  centre_id: string;
  child_id?: string;
  limit?: number;
  offset?: number;
}

export interface SupportNeedSearchFilters extends EducationSearchFilters {
  status?: EducationSupportStatus;
  priority?: EducationSupportPriority;
}

export interface GoalSearchFilters extends EducationSearchFilters {
  status?: EducationGoalStatus;
}

export interface ProgressSearchFilters extends EducationSearchFilters {
  goal_id?: string;
}

export interface AchievementSearchFilters extends EducationSearchFilters {
  category?: EducationAchievementCategory;
}

// ─── Display Helpers ─────────────────────────────────────────

export function getEducationStatusDisplay(s: EducationStatus): string {
  const map: Record<EducationStatus, string> = {
    ATTENDING: "Attending",
    NOT_ATTENDING: "Not Attending",
    COMPLETED: "Completed",
    TEMPORARILY_NOT_ATTENDING: "Temporarily Not Attending",
  };
  return map[s];
}

export function getEducationSupportTypeDisplay(t: EducationSupportType): string {
  const map: Record<EducationSupportType, string> = {
    BOOKS: "Books",
    UNIFORM: "Uniform",
    STATIONERY: "Stationery",
    SCHOOL_BAG: "School Bag",
    TRANSPORT: "Transport",
    SCHOOL_FEES: "School Fees",
    OTHER: "Other Educational Need",
  };
  return map[t];
}

export function getEducationSupportPriorityDisplay(p: EducationSupportPriority): string {
  const map: Record<EducationSupportPriority, string> = {
    HIGH: "High",
    MEDIUM: "Medium",
    LOW: "Low",
  };
  return map[p];
}

export function getEducationSupportStatusDisplay(s: EducationSupportStatus): string {
  const map: Record<EducationSupportStatus, string> = {
    IDENTIFIED: "Identified",
    IN_PROGRESS: "In Progress",
    SUPPORTED: "Supported",
    CLOSED: "Closed",
  };
  return map[s];
}

export function getEducationGoalStatusDisplay(s: EducationGoalStatus): string {
  const map: Record<EducationGoalStatus, string> = {
    NOT_STARTED: "Not Started",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
  };
  return map[s];
}

export function getEducationProgressStatusDisplay(s: EducationProgressStatus): string {
  const map: Record<EducationProgressStatus, string> = {
    NOT_STARTED: "Not Started",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
  };
  return map[s];
}

export function getEducationAchievementCategoryDisplay(c: EducationAchievementCategory): string {
  const map: Record<EducationAchievementCategory, string> = {
    GOAL_COMPLETION: "Goal Completion",
    SKILL: "New Skill",
    TRAINING: "Training",
    CERTIFICATE: "Certificate",
    EDUCATIONAL: "Educational",
    PERSONAL: "Personal",
    OTHER: "Other",
  };
  return map[c];
}
