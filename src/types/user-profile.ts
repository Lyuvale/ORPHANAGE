export type UserProfileStatus = "active" | "deactivated";

export interface UserProfile {
  id: string;
  auth_user_id: string;
  centre_id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  phone: string | null;
  email: string | null;
  status: UserProfileStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateUserProfileInput {
  auth_user_id: string;
  centre_id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  phone?: string;
  email?: string;
  status?: UserProfileStatus;
}

export interface UpdateUserProfileInput {
  centre_id?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  status?: UserProfileStatus;
}

export const USER_PROFILE_STATUSES = ["active", "deactivated"] as const;

export type UserProfileStatusTuple = typeof USER_PROFILE_STATUSES;
