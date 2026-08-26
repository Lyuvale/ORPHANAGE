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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      centre_status: "active" | "suspended" | "deactivated";
      user_profile_status: "active" | "deactivated";
    };
    CompositeTypes: Record<string, never>;
  };
}
