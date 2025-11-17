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
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
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
      [_ in never]: never
    }
    Functions: {
      calculate_location_audit_score: {
        Args: { audit_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "checker"
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
      app_role: ["admin", "checker"],
    },
  },
} as const
