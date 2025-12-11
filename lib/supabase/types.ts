/**
 * Supabaseデータベースの型定義
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type PrimaryRole = 'family' | 'staff' | 'manager' | 'admin' | 'super_admin';
export type FamilyMemberRole = 'family' | 'care_staff' | 'care_manager';
export type OrganizationMemberRole = 'owner' | 'manager' | 'staff';
export type Gender = 'male' | 'female' | 'other';
export type SubscriptionType = 'organization' | 'individual' | 'free';
export type ServiceStatus = 'active' | 'paused' | 'terminated';

export interface Database {
  public: {
    Tables: {
      app_profiles: {
        Row: {
          user_id: string;
          full_name: string | null;
          primary_role: PrimaryRole | null;
          phone: string | null;
          gender: Gender | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          full_name?: string | null;
          primary_role?: PrimaryRole | null;
          phone?: string | null;
          gender?: Gender | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          full_name?: string | null;
          primary_role?: PrimaryRole | null;
          phone?: string | null;
          gender?: Gender | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          billing_plan: string;
          logo_url: string | null;
          custom_domain: string | null;
          email: string | null;
          address: string | null;
          current_family_count: number;
          current_staff_count: number;
          business_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          billing_plan?: string;
          logo_url?: string | null;
          custom_domain?: string | null;
          email?: string | null;
          address?: string | null;
          current_family_count?: number;
          current_staff_count?: number;
          business_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          billing_plan?: string;
          logo_url?: string | null;
          custom_domain?: string | null;
          email?: string | null;
          address?: string | null;
          current_family_count?: number;
          current_staff_count?: number;
          business_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      families: {
        Row: {
          id: string;
          organization_id: string;
          label: string;
          note: string | null;
          address: string | null;
          phone: string | null;
          emergency_contact: string | null;
          subscription_type: SubscriptionType;
          service_status: ServiceStatus;
          meta: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          label: string;
          note?: string | null;
          address?: string | null;
          phone?: string | null;
          emergency_contact?: string | null;
          subscription_type?: SubscriptionType;
          service_status?: ServiceStatus;
          meta?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          label?: string;
          note?: string | null;
          address?: string | null;
          phone?: string | null;
          emergency_contact?: string | null;
          subscription_type?: SubscriptionType;
          service_status?: ServiceStatus;
          meta?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      care_persons: {
        Row: {
          id: string;
          family_id: string;
          full_name: string;
          birthday: string | null;
          gender: Gender | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          full_name: string;
          birthday?: string | null;
          gender?: Gender | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string;
          full_name?: string;
          birthday?: string | null;
          gender?: Gender | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      family_members: {
        Row: {
          family_id: string;
          user_id: string;
          role: FamilyMemberRole;
          relationship: string | null;
          meta: Json | null;
          created_at: string;
        };
        Insert: {
          family_id: string;
          user_id: string;
          role: FamilyMemberRole;
          relationship?: string | null;
          meta?: Json | null;
          created_at?: string;
        };
        Update: {
          family_id?: string;
          user_id?: string;
          role?: FamilyMemberRole;
          relationship?: string | null;
          meta?: Json | null;
          created_at?: string;
        };
      };
      organization_members: {
        Row: {
          organization_id: string;
          user_id: string;
          role: OrganizationMemberRole;
          created_at: string;
        };
        Insert: {
          organization_id: string;
          user_id: string;
          role: OrganizationMemberRole;
          created_at?: string;
        };
        Update: {
          organization_id?: string;
          user_id?: string;
          role?: OrganizationMemberRole;
          created_at?: string;
        };
      };
      family_files: {
        Row: {
          id: string;
          family_id: string;
          uploaded_by: string;
          category: string | null;
          original_name: string;
          supabase_path: string;
          openai_file_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          uploaded_by: string;
          category?: string | null;
          original_name: string;
          supabase_path: string;
          openai_file_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string;
          uploaded_by?: string;
          category?: string | null;
          original_name?: string;
          supabase_path?: string;
          openai_file_id?: string | null;
          created_at?: string;
        };
      };
      organization_invitations: {
        Row: {
          id: string;
          organization_id: string;
          code: string;
          role: OrganizationMemberRole;
          created_by: string;
          expires_at: string;
          max_uses: number;
          used_count: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          code: string;
          role: OrganizationMemberRole;
          created_by: string;
          expires_at: string;
          max_uses?: number;
          used_count?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          code?: string;
          role?: OrganizationMemberRole;
          created_by?: string;
          expires_at?: string;
          max_uses?: number;
          used_count?: number;
          is_active?: boolean;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

/**
 * ユーザープロフィール（app_profiles + family情報）
 */
export interface UserProfile {
  user_id: string;
  full_name: string | null;
  primary_role: PrimaryRole | null;
  phone: string | null;
  gender?: Gender | null;
  email?: string;
  is_super_admin: boolean;
  families?: Array<{
    family_id: string;
    family_label: string;
    role: FamilyMemberRole;
    relationship: string | null;
  }>;
  organizations?: Array<{
    organization_id: string;
    organization_name: string;
    role: OrganizationMemberRole;
  }>;
}

/**
 * 事業所情報（メンバー数・家族数含む）
 */
export interface OrganizationWithStats {
  id: string;
  name: string;
  billing_plan: string;
  created_at: string;
  updated_at: string;
  member_count: number;
  family_count: number;
}

/**
 * 事業所メンバー（ユーザー情報含む）
 */
export interface OrganizationMemberWithUser {
  organization_id: string;
  user_id: string;
  role: OrganizationMemberRole;
  created_at: string;
  user_name: string | null;
  user_email: string | null;
  user_phone: string | null;
}
