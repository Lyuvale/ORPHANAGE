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
      audit_logs: {
        Row: {
          id: string;
          centre_id: string;
          actor_user_id: string | null;
          actor_email: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          previous_values: Json | null;
          new_values: Json | null;
          metadata: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          centre_id: string;
          actor_user_id?: string | null;
          actor_email?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          previous_values?: Json | null;
          new_values?: Json | null;
          metadata?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          centre_id?: string;
          actor_user_id?: string | null;
          actor_email?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          previous_values?: Json | null;
          new_values?: Json | null;
          metadata?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
      };
      children: {
        Row: {
          id: string;
          centre_id: string;
          reference_number: string;
          first_name: string;
          middle_name: string | null;
          last_name: string;
          preferred_name: string | null;
          date_of_birth: string;
          gender: string;
          nationality: string | null;
          photo_url: string | null;
          status: string;
          admission_date: string;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          centre_id: string;
          reference_number: string;
          first_name: string;
          middle_name?: string | null;
          last_name: string;
          preferred_name?: string | null;
          date_of_birth: string;
          gender: string;
          nationality?: string | null;
          photo_url?: string | null;
          status?: string;
          admission_date: string;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          centre_id?: string;
          reference_number?: string;
          first_name?: string;
          middle_name?: string | null;
          last_name?: string;
          preferred_name?: string | null;
          date_of_birth?: string;
          gender?: string;
          nationality?: string | null;
          photo_url?: string | null;
          status?: string;
          admission_date?: string;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      child_status_history: {
        Row: {
          id: string;
          child_id: string;
          centre_id: string;
          previous_status: string | null;
          new_status: string;
          changed_by: string | null;
          changed_at: string;
          reason: string | null;
        };
        Insert: {
          id?: string;
          child_id: string;
          centre_id: string;
          previous_status?: string | null;
          new_status: string;
          changed_by?: string | null;
          changed_at?: string;
          reason?: string | null;
        };
        Update: {
          id?: string;
          child_id?: string;
          centre_id?: string;
          previous_status?: string | null;
          new_status?: string;
          changed_by?: string | null;
          changed_at?: string;
          reason?: string | null;
        };
      };
      referrals: {
        Row: {
          id: string;
          centre_id: string;
          reference_number: string;
          child_first_name: string;
          child_middle_name: string | null;
          child_last_name: string;
          child_date_of_birth: string | null;
          child_gender: string | null;
          child_nationality: string | null;
          source: string;
          priority: string;
          status: string;
          referrer_name: string | null;
          referrer_org: string | null;
          referrer_contact: string | null;
          reason: string;
          notes: string | null;
          submitted_by: string | null;
          submitted_at: string;
          reviewed_by: string | null;
          reviewed_at: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          centre_id: string;
          reference_number: string;
          child_first_name: string;
          child_middle_name?: string | null;
          child_last_name: string;
          child_date_of_birth?: string | null;
          child_gender?: string | null;
          child_nationality?: string | null;
          source: string;
          priority?: string;
          status?: string;
          referrer_name?: string | null;
          referrer_org?: string | null;
          referrer_contact?: string | null;
          reason: string;
          notes?: string | null;
          submitted_by?: string | null;
          submitted_at?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          centre_id?: string;
          reference_number?: string;
          child_first_name?: string;
          child_middle_name?: string | null;
          child_last_name?: string;
          child_date_of_birth?: string | null;
          child_gender?: string | null;
          child_nationality?: string | null;
          source?: string;
          priority?: string;
          status?: string;
          referrer_name?: string | null;
          referrer_org?: string | null;
          referrer_contact?: string | null;
          reason?: string;
          notes?: string | null;
          submitted_by?: string | null;
          submitted_at?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      referral_documents: {
        Row: {
          id: string;
          referral_id: string;
          centre_id: string;
          file_name: string;
          file_type: string | null;
          file_size: number | null;
          storage_path: string;
          uploaded_by: string | null;
          uploaded_at: string;
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          referral_id: string;
          centre_id: string;
          file_name: string;
          file_type?: string | null;
          file_size?: number | null;
          storage_path: string;
          uploaded_by?: string | null;
          uploaded_at?: string;
          metadata?: Json | null;
        };
        Update: {
          id?: string;
          referral_id?: string;
          centre_id?: string;
          file_name?: string;
          file_type?: string | null;
          file_size?: number | null;
          storage_path?: string;
          uploaded_by?: string | null;
          uploaded_at?: string;
          metadata?: Json | null;
        };
      };
      admissions: {
        Row: {
          id: string;
          centre_id: string;
          referral_id: string;
          reference_number: string;
          status: string;
          decision: string | null;
          conditions: string | null;
          admitted_date: string | null;
          admitted_by: string | null;
          denied_reason: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          centre_id: string;
          referral_id: string;
          reference_number: string;
          status?: string;
          decision?: string | null;
          conditions?: string | null;
          admitted_date?: string | null;
          admitted_by?: string | null;
          denied_reason?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          centre_id?: string;
          referral_id?: string;
          reference_number?: string;
          status?: string;
          decision?: string | null;
          conditions?: string | null;
          admitted_date?: string | null;
          admitted_by?: string | null;
          denied_reason?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      admission_history: {
        Row: {
          id: string;
          admission_id: string;
          centre_id: string;
          previous_status: string | null;
          new_status: string;
          changed_by: string | null;
          changed_at: string;
          reason: string | null;
        };
        Insert: {
          id?: string;
          admission_id: string;
          centre_id: string;
          previous_status?: string | null;
          new_status: string;
          changed_by?: string | null;
          changed_at?: string;
          reason?: string | null;
        };
        Update: {
          id?: string;
          admission_id?: string;
          centre_id?: string;
          previous_status?: string | null;
          new_status?: string;
          changed_by?: string | null;
          changed_at?: string;
          reason?: string | null;
        };
      };
      placements: {
        Row: {
          id: string;
          centre_id: string;
          child_id: string;
          admission_id: string | null;
          reference_number: string;
          status: string;
          bed_reference: string | null;
          room_number: string | null;
          start_date: string;
          end_date: string | null;
          placement_type: string;
          notes: string | null;
          assigned_by: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          centre_id: string;
          child_id: string;
          admission_id?: string | null;
          reference_number: string;
          status?: string;
          bed_reference?: string | null;
          room_number?: string | null;
          start_date: string;
          end_date?: string | null;
          placement_type?: string;
          notes?: string | null;
          assigned_by?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          centre_id?: string;
          child_id?: string;
          admission_id?: string | null;
          reference_number?: string;
          status?: string;
          bed_reference?: string | null;
          room_number?: string | null;
          start_date?: string;
          end_date?: string | null;
          placement_type?: string;
          notes?: string | null;
          assigned_by?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      guardians: {
        Row: {
          id: string;
          centre_id: string;
          first_name: string;
          middle_name: string | null;
          last_name: string;
          preferred_name: string | null;
          gender: string | null;
          date_of_birth: string | null;
          phone: string | null;
          alternative_phone: string | null;
          email: string | null;
          address: string | null;
          occupation: string | null;
          id_reference: string | null;
          status: string;
          notes: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          centre_id: string;
          first_name: string;
          middle_name?: string | null;
          last_name: string;
          preferred_name?: string | null;
          gender?: string | null;
          date_of_birth?: string | null;
          phone?: string | null;
          alternative_phone?: string | null;
          email?: string | null;
          address?: string | null;
          occupation?: string | null;
          id_reference?: string | null;
          status?: string;
          notes?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          centre_id?: string;
          first_name?: string;
          middle_name?: string | null;
          last_name?: string;
          preferred_name?: string | null;
          gender?: string | null;
          date_of_birth?: string | null;
          phone?: string | null;
          alternative_phone?: string | null;
          email?: string | null;
          address?: string | null;
          occupation?: string | null;
          id_reference?: string | null;
          status?: string;
          notes?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      child_guardians: {
        Row: {
          id: string;
          child_id: string;
          guardian_id: string;
          centre_id: string;
          relationship_type: string;
          is_primary: boolean;
          is_active: boolean;
          start_date: string;
          end_date: string | null;
          legal_authority: string;
          contact_permitted: boolean;
          updates_permitted: boolean;
          visit_permitted: boolean;
          meeting_permitted: boolean;
          information_permitted: boolean;
          contact_restricted: boolean;
          visits_restricted: boolean;
          restriction_notes: string | null;
          notes: string | null;
          created_by: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          child_id: string;
          guardian_id: string;
          centre_id: string;
          relationship_type: string;
          is_primary?: boolean;
          is_active?: boolean;
          start_date?: string;
          end_date?: string | null;
          legal_authority?: string;
          contact_permitted?: boolean;
          updates_permitted?: boolean;
          visit_permitted?: boolean;
          meeting_permitted?: boolean;
          information_permitted?: boolean;
          contact_restricted?: boolean;
          visits_restricted?: boolean;
          restriction_notes?: string | null;
          notes?: string | null;
          created_by?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          child_id?: string;
          guardian_id?: string;
          centre_id?: string;
          relationship_type?: string;
          is_primary?: boolean;
          is_active?: boolean;
          start_date?: string;
          end_date?: string | null;
          legal_authority?: string;
          contact_permitted?: boolean;
          updates_permitted?: boolean;
          visit_permitted?: boolean;
          meeting_permitted?: boolean;
          information_permitted?: boolean;
          contact_restricted?: boolean;
          visits_restricted?: boolean;
          restriction_notes?: string | null;
          notes?: string | null;
          created_by?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      guardian_documents: {
        Row: {
          id: string;
          guardian_id: string;
          centre_id: string;
          relationship_id: string | null;
          document_type: string;
          file_name: string;
          file_type: string | null;
          file_size: number | null;
          storage_path: string;
          uploaded_by: string | null;
          uploaded_at: string;
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          guardian_id: string;
          centre_id: string;
          relationship_id?: string | null;
          document_type?: string;
          file_name: string;
          file_type?: string | null;
          file_size?: number | null;
          storage_path: string;
          uploaded_by?: string | null;
          uploaded_at?: string;
          metadata?: Json | null;
        };
        Update: {
          id?: string;
          guardian_id?: string;
          centre_id?: string;
          relationship_id?: string | null;
          document_type?: string;
          file_name?: string;
          file_type?: string | null;
          file_size?: number | null;
          storage_path?: string;
          uploaded_by?: string | null;
          uploaded_at?: string;
          metadata?: Json | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      centre_status: "active" | "suspended" | "deactivated";
      user_profile_status: "active" | "deactivated";
      user_role_status: "active" | "revoked";
      child_status: "active" | "transferred" | "graduated" | "alumni" | "deactivated";
      referral_status: "submitted" | "under_review" | "admitted" | "rejected" | "withdrawn";
      referral_source: "police" | "court" | "hospital" | "school" | "community" | "government" | "self_referral" | "other";
      referral_priority: "low" | "medium" | "high" | "urgent";
      admission_status: "pending" | "approved" | "denied" | "cancelled";
      placement_status: "active" | "completed" | "transferred" | "discharged";
      guardian_status: "active" | "inactive" | "deceased" | "unknown";
      relationship_type: "mother" | "father" | "grandparent" | "sibling" | "aunt" | "uncle" | "legal_guardian" | "foster_caregiver" | "other_relative" | "other_authorised";
      legal_authority_type: "parent" | "legal_guardian" | "court_authorised" | "other_authorised" | "none";
    };
    CompositeTypes: Record<string, never>;
  };
}
