export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      centres: {
        Row: {
          id: string;
          name: string;
          code: string;
          contact_email: string | null;
          contact_phone: string | null;
          address_line1: string | null;
          address_line2: string | null;
          city: string | null;
          state: string | null;
          postal_code: string | null;
          country: string;
          status: "active" | "suspended" | "deactivated";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          contact_email?: string | null;
          contact_phone?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          city?: string | null;
          state?: string | null;
          postal_code?: string | null;
          country?: string;
          status?: "active" | "suspended" | "deactivated";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string;
          contact_email?: string | null;
          contact_phone?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          city?: string | null;
          state?: string | null;
          postal_code?: string | null;
          country?: string;
          status?: "active" | "suspended" | "deactivated";
          created_at?: string;
          updated_at?: string;
        };
      };
      user_profiles: {
        Row: {
          id: string;
          auth_user_id: string;
          centre_id: string;
          first_name: string;
          middle_name: string | null;
          last_name: string;
          phone: string | null;
          email: string | null;
          status: "active" | "deactivated";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id: string;
          centre_id: string;
          first_name: string;
          middle_name?: string | null;
          last_name: string;
          phone?: string | null;
          email?: string | null;
          status?: "active" | "deactivated";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          auth_user_id?: string;
          centre_id?: string;
          first_name?: string;
          middle_name?: string | null;
          last_name?: string;
          phone?: string | null;
          email?: string | null;
          status?: "active" | "deactivated";
          created_at?: string;
          updated_at?: string;
        };
      };
      roles: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          is_system: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          is_system?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          is_system?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      permissions: {
        Row: {
          id: string;
          module: string;
          action: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          module: string;
          action: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          module?: string;
          action?: string;
          description?: string | null;
          created_at?: string;
        };
      };
      role_permissions: {
        Row: {
          role_id: string;
          permission_id: string;
          created_at: string;
        };
        Insert: {
          role_id: string;
          permission_id: string;
          created_at?: string;
        };
        Update: {
          role_id?: string;
          permission_id?: string;
          created_at?: string;
        };
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role_id: string;
          centre_id: string;
          assigned_by: string | null;
          assigned_at: string;
          status: "active" | "revoked";
        };
        Insert: {
          id?: string;
          user_id: string;
          role_id: string;
          centre_id: string;
          assigned_by?: string | null;
          assigned_at?: string;
          status?: "active" | "revoked";
        };
        Update: {
          id?: string;
          user_id?: string;
          role_id?: string;
          centre_id?: string;
          assigned_by?: string | null;
          assigned_at?: string;
          status?: "active" | "revoked";
        };
      };
      role_history: {
        Row: {
          id: string;
          user_id: string;
          centre_id: string;
          previous_role_id: string | null;
          new_role_id: string;
          changed_by: string | null;
          changed_at: string;
          reason: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          centre_id: string;
          previous_role_id?: string | null;
          new_role_id: string;
          changed_by?: string | null;
          changed_at?: string;
          reason?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          centre_id?: string;
          previous_role_id?: string | null;
          new_role_id?: string;
          changed_by?: string | null;
          changed_at?: string;
          reason?: string | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      centre_status: "active" | "suspended" | "deactivated";
      user_profile_status: "active" | "deactivated";
      user_role_status: "active" | "revoked";
    };
    CompositeTypes: Record<string, never>;
  };
}
