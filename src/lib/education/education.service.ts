import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  EducationProfile,
  CreateEducationProfileInput,
  UpdateEducationProfileInput,
  EducationSupportNeed,
  CreateEducationSupportNeedInput,
  UpdateEducationSupportNeedInput,
  EducationGoal,
  CreateEducationGoalInput,
  UpdateEducationGoalInput,
  EducationProgress,
  CreateEducationProgressInput,
  EducationAchievement,
  CreateEducationAchievementInput,
  EducationOverview,
  SupportNeedSearchFilters,
  GoalSearchFilters,
  ProgressSearchFilters,
  AchievementSearchFilters,
} from "@/types/education";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = SupabaseClient<any, "public", any>;

// ─── Education Profile ───────────────────────────────────────

export async function getEducationProfile(
  adminSupabase: AdminClient,
  centreId: string,
  childId: string,
): Promise<EducationProfile | null> {
  const { data, error } = await adminSupabase
    .from("education_profiles")
    .select("*")
    .eq("centre_id", centreId)
    .eq("child_id", childId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get education profile: ${error.message}`);
  }
  return (data as EducationProfile) ?? null;
}

export async function getEducationProfileById(
  adminSupabase: AdminClient,
  id: string,
): Promise<EducationProfile | null> {
  const { data, error } = await adminSupabase
    .from("education_profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get education profile: ${error.message}`);
  }
  return data as EducationProfile;
}

export async function createEducationProfile(
  adminSupabase: AdminClient,
  input: CreateEducationProfileInput,
  userId: string,
): Promise<EducationProfile> {
  const payload: Record<string, unknown> = {
    centre_id: input.centre_id,
    child_id: input.child_id,
    education_status: input.education_status ?? "ATTENDING",
    school_name: input.school_name ?? null,
    education_level: input.education_level ?? null,
    general_status: input.general_status ?? null,
    notes: input.notes ?? null,
    created_by: userId,
  };

  const { data, error } = await adminSupabase
    .from("education_profiles")
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("An education profile already exists for this child");
    }
    if (error.code === "23503") {
      throw new Error("Invalid child or centre reference");
    }
    throw new Error(`Failed to create education profile: ${error.message}`);
  }
  return data as EducationProfile;
}

export async function updateEducationProfile(
  adminSupabase: AdminClient,
  id: string,
  input: UpdateEducationProfileInput,
): Promise<EducationProfile> {
  const payload: Record<string, unknown> = {};
  if (input.education_status !== undefined) payload.education_status = input.education_status;
  if (input.school_name !== undefined) payload.school_name = input.school_name;
  if (input.education_level !== undefined) payload.education_level = input.education_level;
  if (input.general_status !== undefined) payload.general_status = input.general_status;
  if (input.notes !== undefined) payload.notes = input.notes;

  const { data, error } = await adminSupabase
    .from("education_profiles")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") throw new Error("Education profile not found");
    throw new Error(`Failed to update education profile: ${error.message}`);
  }
  return data as EducationProfile;
}

// ─── Education Support Needs ─────────────────────────────────

export async function listEducationSupportNeeds(
  adminSupabase: AdminClient,
  filters: SupportNeedSearchFilters,
): Promise<{ data: EducationSupportNeed[]; count: number }> {
  let query = adminSupabase
    .from("education_support_needs")
    .select("*", { count: "exact" })
    .eq("centre_id", filters.centre_id)
    .order("identified_date", { ascending: false, nullsFirst: false });

  if (filters.child_id) query = query.eq("child_id", filters.child_id);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.priority) query = query.eq("priority", filters.priority);

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to list education support needs: ${error.message}`);
  return { data: (data ?? []) as EducationSupportNeed[], count: count ?? 0 };
}

export async function getEducationSupportNeedById(
  adminSupabase: AdminClient,
  id: string,
): Promise<EducationSupportNeed | null> {
  const { data, error } = await adminSupabase
    .from("education_support_needs")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get education support need: ${error.message}`);
  }
  return data as EducationSupportNeed;
}

export async function createEducationSupportNeed(
  adminSupabase: AdminClient,
  input: CreateEducationSupportNeedInput,
  userId: string,
): Promise<EducationSupportNeed> {
  const payload: Record<string, unknown> = {
    centre_id: input.centre_id,
    child_id: input.child_id,
    support_type: input.support_type,
    description: input.description ?? null,
    identified_date: input.identified_date ?? new Date().toISOString().slice(0, 10),
    priority: input.priority ?? "MEDIUM",
    status: input.status ?? "IDENTIFIED",
    notes: input.notes ?? null,
    created_by: userId,
  };

  const { data, error } = await adminSupabase
    .from("education_support_needs")
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23503") throw new Error("Invalid child or centre reference");
    throw new Error(`Failed to create education support need: ${error.message}`);
  }
  return data as EducationSupportNeed;
}

export async function updateEducationSupportNeed(
  adminSupabase: AdminClient,
  id: string,
  input: UpdateEducationSupportNeedInput,
): Promise<EducationSupportNeed> {
  const payload: Record<string, unknown> = {};
  if (input.support_type !== undefined) payload.support_type = input.support_type;
  if (input.description !== undefined) payload.description = input.description;
  if (input.identified_date !== undefined) payload.identified_date = input.identified_date;
  if (input.priority !== undefined) payload.priority = input.priority;
  if (input.status !== undefined) payload.status = input.status;
  if (input.notes !== undefined) payload.notes = input.notes;

  const { data, error } = await adminSupabase
    .from("education_support_needs")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") throw new Error("Education support need not found");
    throw new Error(`Failed to update education support need: ${error.message}`);
  }
  return data as EducationSupportNeed;
}

// ─── Development Goals ───────────────────────────────────────

export async function listEducationGoals(
  adminSupabase: AdminClient,
  filters: GoalSearchFilters,
): Promise<{ data: EducationGoal[]; count: number }> {
  let query = adminSupabase
    .from("education_goals")
    .select("*", { count: "exact" })
    .eq("centre_id", filters.centre_id)
    .order("created_at", { ascending: false });

  if (filters.child_id) query = query.eq("child_id", filters.child_id);
  if (filters.status) query = query.eq("status", filters.status);

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to list development goals: ${error.message}`);
  return { data: (data ?? []) as EducationGoal[], count: count ?? 0 };
}

export async function getEducationGoalById(
  adminSupabase: AdminClient,
  id: string,
): Promise<EducationGoal | null> {
  const { data, error } = await adminSupabase
    .from("education_goals")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get development goal: ${error.message}`);
  }
  return data as EducationGoal;
}

export async function createEducationGoal(
  adminSupabase: AdminClient,
  input: CreateEducationGoalInput,
  userId: string,
): Promise<EducationGoal> {
  const payload: Record<string, unknown> = {
    centre_id: input.centre_id,
    child_id: input.child_id,
    title: input.title,
    description: input.description ?? null,
    start_date: input.start_date ?? null,
    target_date: input.target_date ?? null,
    status: input.status ?? "NOT_STARTED",
    created_by: userId,
  };

  if (payload.status === "COMPLETED") {
    payload.completed_at = new Date().toISOString();
  }

  const { data, error } = await adminSupabase
    .from("education_goals")
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23503") throw new Error("Invalid child or centre reference");
    throw new Error(`Failed to create development goal: ${error.message}`);
  }
  return data as EducationGoal;
}

export async function updateEducationGoal(
  adminSupabase: AdminClient,
  id: string,
  input: UpdateEducationGoalInput,
): Promise<EducationGoal> {
  const payload: Record<string, unknown> = {};
  if (input.title !== undefined) payload.title = input.title;
  if (input.description !== undefined) payload.description = input.description;
  if (input.start_date !== undefined) payload.start_date = input.start_date;
  if (input.target_date !== undefined) payload.target_date = input.target_date;
  if (input.status !== undefined) {
    payload.status = input.status;
    payload.completed_at = input.status === "COMPLETED" ? new Date().toISOString() : null;
  }

  const { data, error } = await adminSupabase
    .from("education_goals")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") throw new Error("Development goal not found");
    throw new Error(`Failed to update development goal: ${error.message}`);
  }
  return data as EducationGoal;
}

export async function updateEducationGoalStatus(
  adminSupabase: AdminClient,
  id: string,
  status: EducationGoal["status"],
): Promise<EducationGoal> {
  return updateEducationGoal(adminSupabase, id, { status });
}

// ─── Progress (append-only history) ──────────────────────────

export async function listEducationProgress(
  adminSupabase: AdminClient,
  filters: ProgressSearchFilters,
): Promise<{ data: EducationProgress[]; count: number }> {
  let query = adminSupabase
    .from("education_progress")
    .select("*", { count: "exact" })
    .eq("centre_id", filters.centre_id)
    .order("progress_date", { ascending: false });

  if (filters.child_id) query = query.eq("child_id", filters.child_id);
  if (filters.goal_id) query = query.eq("goal_id", filters.goal_id);

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to list progress updates: ${error.message}`);
  return { data: (data ?? []) as EducationProgress[], count: count ?? 0 };
}

export async function getEducationProgressById(
  adminSupabase: AdminClient,
  id: string,
): Promise<EducationProgress | null> {
  const { data, error } = await adminSupabase
    .from("education_progress")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get progress update: ${error.message}`);
  }
  return data as EducationProgress;
}

/**
 * Record a progress update. This is APPEND-ONLY: each update creates a
 * new record and previous progress is never overwritten or deleted.
 * The goal_id is validated to belong to the same child/centre.
 */
export async function createEducationProgress(
  adminSupabase: AdminClient,
  input: CreateEducationProgressInput,
  userId: string,
): Promise<EducationProgress> {
  const goal = await getEducationGoalById(adminSupabase, input.goal_id);
  if (!goal) throw new Error("Development goal not found");
  if (goal.centre_id !== input.centre_id || goal.child_id !== input.child_id) {
    throw new Error("Development goal does not belong to this child/centre");
  }

  const payload: Record<string, unknown> = {
    centre_id: input.centre_id,
    child_id: input.child_id,
    goal_id: input.goal_id,
    progress_date: input.progress_date ?? new Date().toISOString().slice(0, 10),
    progress_status: input.progress_status ?? "IN_PROGRESS",
    observation: input.observation ?? null,
    recorded_by: userId,
  };

  const { data, error } = await adminSupabase
    .from("education_progress")
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23503") throw new Error("Invalid goal, child or centre reference");
    throw new Error(`Failed to record progress update: ${error.message}`);
  }
  return data as EducationProgress;
}

// ─── Achievements ────────────────────────────────────────────

export async function listEducationAchievements(
  adminSupabase: AdminClient,
  filters: AchievementSearchFilters,
): Promise<{ data: EducationAchievement[]; count: number }> {
  let query = adminSupabase
    .from("education_achievements")
    .select("*", { count: "exact" })
    .eq("centre_id", filters.centre_id)
    .order("achievement_date", { ascending: false, nullsFirst: false });

  if (filters.child_id) query = query.eq("child_id", filters.child_id);
  if (filters.category) query = query.eq("category", filters.category);

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to list achievements: ${error.message}`);
  return { data: (data ?? []) as EducationAchievement[], count: count ?? 0 };
}

export async function createEducationAchievement(
  adminSupabase: AdminClient,
  input: CreateEducationAchievementInput,
  userId: string,
): Promise<EducationAchievement> {
  const payload: Record<string, unknown> = {
    centre_id: input.centre_id,
    child_id: input.child_id,
    title: input.title,
    description: input.description ?? null,
    achievement_date: input.achievement_date ?? new Date().toISOString().slice(0, 10),
    category: input.category ?? "EDUCATIONAL",
    evidence_reference: input.evidence_reference ?? null,
    recorded_by: userId,
  };

  const { data, error } = await adminSupabase
    .from("education_achievements")
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23503") throw new Error("Invalid child or centre reference");
    throw new Error(`Failed to create achievement: ${error.message}`);
  }
  return data as EducationAchievement;
}

// ─── Education & Development Overview (dashboard summary) ────

export async function getEducationOverview(
  adminSupabase: AdminClient,
  centreId: string,
  childId: string,
): Promise<EducationOverview> {
  const profile = await getEducationProfile(adminSupabase, centreId, childId);

  const activeStatuses = ["IDENTIFIED", "IN_PROGRESS"];
  const { count: activeNeeds } = await adminSupabase
    .from("education_support_needs")
    .select("id", { count: "exact", head: true })
    .eq("centre_id", centreId)
    .eq("child_id", childId)
    .in("status", activeStatuses);

  const { count: highPriorityNeeds } = await adminSupabase
    .from("education_support_needs")
    .select("id", { count: "exact", head: true })
    .eq("centre_id", centreId)
    .eq("child_id", childId)
    .eq("priority", "HIGH")
    .eq("status", "IDENTIFIED");

  const activeGoalStatuses = ["NOT_STARTED", "IN_PROGRESS"];
  const { count: activeGoals } = await adminSupabase
    .from("education_goals")
    .select("id", { count: "exact", head: true })
    .eq("centre_id", centreId)
    .eq("child_id", childId)
    .in("status", activeGoalStatuses);

  const { count: completedGoals } = await adminSupabase
    .from("education_goals")
    .select("id", { count: "exact", head: true })
    .eq("centre_id", centreId)
    .eq("child_id", childId)
    .eq("status", "COMPLETED");

  const { data: latestProgress, error: progressErr } = await adminSupabase
    .from("education_progress")
    .select("observation, progress_date")
    .eq("centre_id", centreId)
    .eq("child_id", childId)
    .order("progress_date", { ascending: false })
    .limit(1);

  if (progressErr) throw new Error(`Failed to load progress summary: ${progressErr.message}`);

  const { count: recentAchievements } = await adminSupabase
    .from("education_achievements")
    .select("id", { count: "exact", head: true })
    .eq("centre_id", centreId)
    .eq("child_id", childId);

  return {
    profile: profile
      ? {
          education_status: profile.education_status,
          school_name: profile.school_name,
        }
      : null,
    active_support_needs: activeNeeds ?? 0,
    high_priority_needs: highPriorityNeeds ?? 0,
    active_goals: activeGoals ?? 0,
    completed_goals: completedGoals ?? 0,
    most_recent_progress: latestProgress?.[0]?.observation ?? null,
    recent_achievements_count: recentAchievements ?? 0,
  };
}
