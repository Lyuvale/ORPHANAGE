/**
 * Daily Care Types
 *
 * Defines daily care records, meal records, daily notes,
 * and care follow-up entities.
 *
 * SECURITY:
 *   - centre_id is always derived server-side, never from client input
 *   - Daily notes are append-only (amendments preserve originals)
 *   - Sensitive care notes require appropriate permissions
 */

// ─── Meal Type ──────────────────────────────────────────────

export const MEAL_TYPES = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
] as const;

export type MealType = (typeof MEAL_TYPES)[number];

// ─── Care Activity Type ─────────────────────────────────────

export const CARE_ACTIVITY_TYPES = [
  "meal",
  "hygiene",
  "clothing",
  "sleep",
  "recreation",
  "special_support",
  "general_wellbeing",
  "other",
] as const;

export type CareActivityType = (typeof CARE_ACTIVITY_TYPES)[number];

// ─── Daily Note Type ────────────────────────────────────────

export const DAILY_NOTE_TYPES = [
  "general",
  "observation",
  "incident",
  "concern",
  "follow_up",
  "other",
] as const;

export type DailyNoteType = (typeof DAILY_NOTE_TYPES)[number];

// ─── Follow-Up Status ───────────────────────────────────────

export const FOLLOWUP_STATUSES = [
  "open",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export type FollowupStatus = (typeof FOLLOWUP_STATUSES)[number];

// ─── Daily Care Record ──────────────────────────────────────

export interface DailyCareRecord {
  id: string;
  centre_id: string;
  child_id: string;
  care_date: string;
  activity_type: CareActivityType;
  description: string | null;
  time_of_day: string | null;
  staff_member_id: string;
  status: string;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CreateDailyCareInput {
  centre_id: string;
  child_id: string;
  care_date: string;
  activity_type: CareActivityType;
  description?: string | null;
  time_of_day?: string | null;
  notes?: string | null;
}

// ─── Meal Record ────────────────────────────────────────────

export interface MealRecord {
  id: string;
  centre_id: string;
  child_id: string;
  meal_date: string;
  meal_type: MealType;
  provided: boolean;
  time_of_day: string | null;
  notes: string | null;
  recorded_by: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface CreateMealInput {
  centre_id: string;
  child_id: string;
  meal_date: string;
  meal_type: MealType;
  provided?: boolean;
  time_of_day?: string | null;
  notes?: string | null;
}

// ─── Daily Note ─────────────────────────────────────────────

export interface DailyNote {
  id: string;
  centre_id: string;
  child_id: string;
  note_date: string;
  note_type: DailyNoteType;
  content: string;
  author_id: string;
  author_name: string | null;
  is_pinned: boolean;
  version: number;
  parent_note_id: string | null;
  is_amended: boolean;
  amended_by: string | null;
  amended_at: string | null;
  amendment_reason: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CreateDailyNoteInput {
  centre_id: string;
  child_id: string;
  note_date: string;
  note_type?: DailyNoteType;
  content: string;
  author_name?: string | null;
  is_pinned?: boolean;
  parent_note_id?: string | null;
}

export interface AmendDailyNoteInput {
  content: string;
  amendment_reason: string;
}

// ─── Care Follow-Up ─────────────────────────────────────────

export interface CareFollowup {
  id: string;
  centre_id: string;
  child_id: string;
  source_note_id: string | null;
  source_care_id: string | null;
  title: string;
  description: string | null;
  status: FollowupStatus;
  responsible_user_id: string | null;
  due_date: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_by: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CreateFollowupInput {
  centre_id: string;
  child_id: string;
  source_note_id?: string | null;
  source_care_id?: string | null;
  title: string;
  description?: string | null;
  responsible_user_id?: string | null;
  due_date?: string | null;
}

export interface UpdateFollowupInput {
  status?: FollowupStatus;
  resolution_notes?: string | null;
  due_date?: string | null;
  responsible_user_id?: string | null;
}

// ─── Search Filters ─────────────────────────────────────────

export interface DailyCareSearchFilters {
  centre_id: string;
  child_id?: string;
  care_date?: string;
  activity_type?: CareActivityType;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

export interface MealSearchFilters {
  centre_id: string;
  child_id?: string;
  meal_date?: string;
  meal_type?: MealType;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

export interface DailyNoteSearchFilters {
  centre_id: string;
  child_id?: string;
  note_date?: string;
  note_type?: DailyNoteType;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

export interface FollowupSearchFilters {
  centre_id: string;
  child_id?: string;
  status?: FollowupStatus;
  responsible_user_id?: string;
  limit?: number;
  offset?: number;
}

// ─── Display Helpers ────────────────────────────────────────

export function getMealTypeDisplay(type: MealType): string {
  const map: Record<MealType, string> = {
    breakfast: "Breakfast",
    lunch: "Lunch",
    dinner: "Dinner",
    snack: "Snack",
  };
  return map[type];
}

export function getCareActivityTypeDisplay(type: CareActivityType): string {
  const map: Record<CareActivityType, string> = {
    meal: "Meal",
    hygiene: "Hygiene",
    clothing: "Clothing",
    sleep: "Sleep/Rest",
    recreation: "Recreation",
    special_support: "Special Support",
    general_wellbeing: "General Wellbeing",
    other: "Other",
  };
  return map[type];
}

export function getDailyNoteTypeDisplay(type: DailyNoteType): string {
  const map: Record<DailyNoteType, string> = {
    general: "General",
    observation: "Observation",
    incident: "Incident",
    concern: "Concern",
    follow_up: "Follow-Up",
    other: "Other",
  };
  return map[type];
}

export function getFollowupStatusDisplay(status: FollowupStatus): string {
  const map: Record<FollowupStatus, string> = {
    open: "Open",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return map[status];
}
