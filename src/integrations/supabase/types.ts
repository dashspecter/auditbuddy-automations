export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          activity_type: string
          created_at: string | null
          description: string
          id: string
          ip_address: string | null
          metadata: Json | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          description: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          description?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      audit_fields: {
        Row: {
          created_at: string
          display_order: number
          field_type: string
          id: string
          is_required: boolean
          name: string
          options: Json | null
          section_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          field_type: string
          id?: string
          is_required?: boolean
          name: string
          options?: Json | null
          section_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          field_type?: string
          id?: string
          is_required?: boolean
          name?: string
          options?: Json | null
          section_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_fields_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "audit_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_photos: {
        Row: {
          audit_id: string
          caption: string | null
          created_at: string
          file_size: number | null
          id: string
          photo_url: string
          updated_at: string
          user_id: string
        }
        Insert: {
          audit_id: string
          caption?: string | null
          created_at?: string
          file_size?: number | null
          id?: string
          photo_url: string
          updated_at?: string
          user_id: string
        }
        Update: {
          audit_id?: string
          caption?: string | null
          created_at?: string
          file_size?: number | null
          id?: string
          photo_url?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_photos_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "location_audits"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_revisions: {
        Row: {
          audit_id: string
          change_summary: string | null
          changed_at: string
          changed_by: string
          changes: Json
          created_at: string
          id: string
          revision_number: number
        }
        Insert: {
          audit_id: string
          change_summary?: string | null
          changed_at?: string
          changed_by: string
          changes: Json
          created_at?: string
          id?: string
          revision_number: number
        }
        Update: {
          audit_id?: string
          change_summary?: string | null
          changed_at?: string
          changed_by?: string
          changes?: Json
          created_at?: string
          id?: string
          revision_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "audit_revisions_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "location_audits"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_sections: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          name: string
          template_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name: string
          template_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name?: string
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_sections_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "audit_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_templates: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          is_global: boolean
          location: string | null
          name: string
          template_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_global?: boolean
          location?: string | null
          name: string
          template_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_global?: boolean
          location?: string | null
          name?: string
          template_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      document_categories: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          title: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          title: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          title?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "document_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      location_audits: {
        Row: {
          audit_date: string
          boh_equipment: number | null
          boh_preparation: number | null
          boh_storage: number | null
          boh_temperature: number | null
          cleaning_equipment: number | null
          cleaning_floors: number | null
          cleaning_surfaces: number | null
          cleaning_waste: number | null
          compliance_documentation: number | null
          compliance_licenses: number | null
          compliance_permits: number | null
          compliance_signage: number | null
          created_at: string
          custom_data: Json | null
          foh_customer_areas: number | null
          foh_menu_boards: number | null
          foh_restrooms: number | null
          foh_seating: number | null
          id: string
          location: string
          notes: string | null
          overall_score: number | null
          status: string | null
          template_id: string | null
          time_end: string | null
          time_start: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          audit_date: string
          boh_equipment?: number | null
          boh_preparation?: number | null
          boh_storage?: number | null
          boh_temperature?: number | null
          cleaning_equipment?: number | null
          cleaning_floors?: number | null
          cleaning_surfaces?: number | null
          cleaning_waste?: number | null
          compliance_documentation?: number | null
          compliance_licenses?: number | null
          compliance_permits?: number | null
          compliance_signage?: number | null
          created_at?: string
          custom_data?: Json | null
          foh_customer_areas?: number | null
          foh_menu_boards?: number | null
          foh_restrooms?: number | null
          foh_seating?: number | null
          id?: string
          location: string
          notes?: string | null
          overall_score?: number | null
          status?: string | null
          template_id?: string | null
          time_end?: string | null
          time_start?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          audit_date?: string
          boh_equipment?: number | null
          boh_preparation?: number | null
          boh_storage?: number | null
          boh_temperature?: number | null
          cleaning_equipment?: number | null
          cleaning_floors?: number | null
          cleaning_surfaces?: number | null
          cleaning_waste?: number | null
          compliance_documentation?: number | null
          compliance_licenses?: number | null
          compliance_permits?: number | null
          compliance_signage?: number | null
          created_at?: string
          custom_data?: Json | null
          foh_customer_areas?: number | null
          foh_menu_boards?: number | null
          foh_restrooms?: number | null
          foh_seating?: number | null
          id?: string
          location?: string
          notes?: string | null
          overall_score?: number | null
          status?: string | null
          template_id?: string | null
          time_end?: string | null
          time_start?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_audits_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "audit_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_audit_logs: {
        Row: {
          action: string
          id: string
          metadata: Json | null
          notification_id: string
          performed_at: string
          performed_by: string
          recipients_count: number | null
          target_roles: string[] | null
        }
        Insert: {
          action: string
          id?: string
          metadata?: Json | null
          notification_id: string
          performed_at?: string
          performed_by: string
          recipients_count?: number | null
          target_roles?: string[] | null
        }
        Update: {
          action?: string
          id?: string
          metadata?: Json | null
          notification_id?: string
          performed_at?: string
          performed_by?: string
          recipients_count?: number | null
          target_roles?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_audit_logs_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notification_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_audit_logs_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_reads: {
        Row: {
          id: string
          notification_id: string
          read_at: string
          snoozed_until: string | null
          user_id: string
        }
        Insert: {
          id?: string
          notification_id: string
          read_at?: string
          snoozed_until?: string | null
          user_id: string
        }
        Update: {
          id?: string
          notification_id?: string
          read_at?: string
          snoozed_until?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notification_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          created_at: string
          created_by: string
          id: string
          message: string
          name: string
          target_roles: string[]
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          message: string
          name: string
          target_roles?: string[]
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          message?: string
          name?: string
          target_roles?: string[]
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          audit_id: string | null
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean
          last_sent_at: string | null
          message: string
          next_scheduled_at: string | null
          recurrence_enabled: boolean | null
          recurrence_pattern: string
          scheduled_for: string | null
          target_roles: string[]
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          audit_id?: string | null
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          message: string
          next_scheduled_at?: string | null
          recurrence_enabled?: boolean | null
          recurrence_pattern?: string
          scheduled_for?: string | null
          target_roles?: string[]
          title: string
          type?: string
          updated_at?: string | null
        }
        Update: {
          audit_id?: string | null
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          message?: string
          next_scheduled_at?: string | null
          recurrence_enabled?: boolean | null
          recurrence_pattern?: string
          scheduled_for?: string | null
          target_roles?: string[]
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "location_audits"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          last_login: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          last_login?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          last_login?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      test_questions: {
        Row: {
          correct_answer: string
          created_at: string
          display_order: number
          id: string
          options: Json
          points: number
          question: string
          test_id: string
        }
        Insert: {
          correct_answer: string
          created_at?: string
          display_order?: number
          id?: string
          options: Json
          points?: number
          question: string
          test_id: string
        }
        Update: {
          correct_answer?: string
          created_at?: string
          display_order?: number
          id?: string
          options?: Json
          points?: number
          question?: string
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_submissions: {
        Row: {
          answers: Json
          completed_at: string | null
          created_at: string
          id: string
          passed: boolean | null
          score: number | null
          staff_location: string
          staff_name: string
          started_at: string
          test_id: string
          time_taken_minutes: number | null
        }
        Insert: {
          answers: Json
          completed_at?: string | null
          created_at?: string
          id?: string
          passed?: boolean | null
          score?: number | null
          staff_location: string
          staff_name: string
          started_at?: string
          test_id: string
          time_taken_minutes?: number | null
        }
        Update: {
          answers?: Json
          completed_at?: string | null
          created_at?: string
          id?: string
          passed?: boolean | null
          score?: number | null
          staff_location?: string
          staff_name?: string
          started_at?: string
          test_id?: string
          time_taken_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "test_submissions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          document_id: string
          expires_at: string | null
          id: string
          is_active: boolean
          passing_score: number
          scheduled_for: string | null
          time_limit_minutes: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          document_id: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          passing_score?: number
          scheduled_for?: string | null
          time_limit_minutes?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          document_id?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          passing_score?: number
          scheduled_for?: string | null
          time_limit_minutes?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tests_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      notification_analytics: {
        Row: {
          created_at: string | null
          id: string | null
          read_count: number | null
          read_rate_percentage: number | null
          recurrence_pattern: string | null
          target_roles: string[] | null
          title: string | null
          total_recipients: number | null
          type: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_location_audit_score: {
        Args: { audit_id: string }
        Returns: number
      }
      get_next_revision_number: {
        Args: { p_audit_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_activity: {
        Args: {
          p_activity_type: string
          p_description: string
          p_metadata?: Json
          p_user_id: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "checker" | "manager"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "checker", "manager"],
    },
  },
} as const
