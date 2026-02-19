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
      agent_logs: {
        Row: {
          agent_type: string
          company_id: string
          details_json: Json
          event_type: string
          id: string
          occurred_at: string
          task_id: string | null
          workflow_id: string | null
        }
        Insert: {
          agent_type: string
          company_id: string
          details_json?: Json
          event_type: string
          id?: string
          occurred_at?: string
          task_id?: string | null
          workflow_id?: string | null
        }
        Update: {
          agent_type?: string
          company_id?: string
          details_json?: Json
          event_type?: string
          id?: string
          occurred_at?: string
          task_id?: string | null
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "agent_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_logs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "agent_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_memory: {
        Row: {
          agent_type: string
          company_id: string
          content_json: Json
          created_at: string
          id: string
          memory_type: string
        }
        Insert: {
          agent_type: string
          company_id: string
          content_json?: Json
          created_at?: string
          id?: string
          memory_type: string
        }
        Update: {
          agent_type?: string
          company_id?: string
          content_json?: Json
          created_at?: string
          id?: string
          memory_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_memory_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_policies: {
        Row: {
          actions_json: Json
          active: boolean
          agent_type: string
          company_id: string
          conditions_json: Json
          created_at: string
          description: string | null
          id: string
          policy_name: string
          updated_at: string
        }
        Insert: {
          actions_json?: Json
          active?: boolean
          agent_type: string
          company_id: string
          conditions_json?: Json
          created_at?: string
          description?: string | null
          id?: string
          policy_name: string
          updated_at?: string
        }
        Update: {
          actions_json?: Json
          active?: boolean
          agent_type?: string
          company_id?: string
          conditions_json?: Json
          created_at?: string
          description?: string | null
          id?: string
          policy_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_policies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_tasks: {
        Row: {
          agent_type: string
          company_id: string
          created_at: string
          goal: string
          id: string
          input_json: Json
          result_json: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          agent_type: string
          company_id: string
          created_at?: string
          goal: string
          id?: string
          input_json?: Json
          result_json?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          agent_type?: string
          company_id?: string
          created_at?: string
          goal?: string
          id?: string
          input_json?: Json
          result_json?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_workflows: {
        Row: {
          agent_type: string
          company_id: string
          created_at: string
          current_step: number
          goal: string
          id: string
          plan_json: Json
          status: string
          updated_at: string
        }
        Insert: {
          agent_type: string
          company_id: string
          created_at?: string
          current_step?: number
          goal: string
          id?: string
          plan_json?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          agent_type?: string
          company_id?: string
          created_at?: string
          current_step?: number
          goal?: string
          id?: string
          plan_json?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_workflows_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_guide_audit_logs: {
        Row: {
          answer_preview: string | null
          company_id: string
          created_at: string
          employee_ids: Json | null
          id: string
          pii_released: boolean | null
          pii_requested: boolean | null
          question: string
          range_from: string | null
          range_to: string | null
          role: string
          tools_used: Json | null
          user_id: string
        }
        Insert: {
          answer_preview?: string | null
          company_id: string
          created_at?: string
          employee_ids?: Json | null
          id?: string
          pii_released?: boolean | null
          pii_requested?: boolean | null
          question: string
          range_from?: string | null
          range_to?: string | null
          role: string
          tools_used?: Json | null
          user_id: string
        }
        Update: {
          answer_preview?: string | null
          company_id?: string
          created_at?: string
          employee_ids?: Json | null
          id?: string
          pii_released?: boolean | null
          pii_requested?: boolean | null
          question?: string
          range_from?: string | null
          range_to?: string | null
          role?: string
          tools_used?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_guide_audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          category: string
          company_id: string
          created_at: string
          id: string
          location_id: string | null
          message: string
          metadata: Json | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          source: string
          source_reference_id: string | null
          title: string
        }
        Insert: {
          category: string
          company_id: string
          created_at?: string
          id?: string
          location_id?: string | null
          message: string
          metadata?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          source: string
          source_reference_id?: string | null
          title: string
        }
        Update: {
          category?: string
          company_id?: string
          created_at?: string
          id?: string
          location_id?: string | null
          message?: string
          metadata?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          source?: string
          source_reference_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      api_call_logs: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          duration_ms: number | null
          endpoint: string
          error_message: string | null
          id: string
          integration_id: string | null
          method: string
          request_payload: Json | null
          response_payload: Json | null
          status_code: number | null
          success: boolean | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          duration_ms?: number | null
          endpoint: string
          error_message?: string | null
          id?: string
          integration_id?: string | null
          method: string
          request_payload?: Json | null
          response_payload?: Json | null
          status_code?: number | null
          success?: boolean | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          duration_ms?: number | null
          endpoint?: string
          error_message?: string | null
          id?: string
          integration_id?: string | null
          method?: string
          request_payload?: Json | null
          response_payload?: Json | null
          status_code?: number | null
          success?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "api_call_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_call_logs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      app_secrets: {
        Row: {
          created_at: string | null
          key: string
          value: string
        }
        Insert: {
          created_at?: string | null
          key: string
          value: string
        }
        Update: {
          created_at?: string | null
          key?: string
          value?: string
        }
        Relationships: []
      }
      asset_categories: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          icon: string | null
          id: string
          is_archived: boolean
          name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          icon?: string | null
          id?: string
          is_archived?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          icon?: string | null
          id?: string
          is_archived?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_alerts: {
        Row: {
          alert_type: string
          company_id: string
          created_at: string
          date: string
          details_json: Json | null
          employee_id: string | null
          id: string
          location_id: string | null
          resolved_at: string | null
          status: string
        }
        Insert: {
          alert_type: string
          company_id: string
          created_at?: string
          date: string
          details_json?: Json | null
          employee_id?: string | null
          id?: string
          location_id?: string | null
          resolved_at?: string | null
          status?: string
        }
        Update: {
          alert_type?: string
          company_id?: string
          created_at?: string
          date?: string
          details_json?: Json | null
          employee_id?: string | null
          id?: string
          location_id?: string | null
          resolved_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_alerts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_alerts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_alerts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_kiosks: {
        Row: {
          company_id: string
          created_at: string
          custom_slug: string | null
          device_name: string
          device_token: string
          id: string
          is_active: boolean
          last_active_at: string | null
          location_id: string
          registered_at: string
          registered_by: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          custom_slug?: string | null
          device_name?: string
          device_token: string
          id?: string
          is_active?: boolean
          last_active_at?: string | null
          location_id: string
          registered_at?: string
          registered_by: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          custom_slug?: string | null
          device_name?: string
          device_token?: string
          id?: string
          is_active?: boolean
          last_active_at?: string | null
          location_id?: string
          registered_at?: string
          registered_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_kiosks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_kiosks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_logs: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          auto_clocked_out: boolean | null
          check_in_at: string
          check_out_at: string | null
          created_at: string
          device_info: Json | null
          expected_clock_in: string | null
          id: string
          is_late: boolean | null
          late_minutes: number | null
          location_id: string
          method: string
          notes: string | null
          shift_id: string | null
          staff_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          auto_clocked_out?: boolean | null
          check_in_at: string
          check_out_at?: string | null
          created_at?: string
          device_info?: Json | null
          expected_clock_in?: string | null
          id?: string
          is_late?: boolean | null
          late_minutes?: number | null
          location_id: string
          method?: string
          notes?: string | null
          shift_id?: string | null
          staff_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          auto_clocked_out?: boolean | null
          check_in_at?: string
          check_out_at?: string | null
          created_at?: string
          device_info?: Json | null
          expected_clock_in?: string | null
          id?: string
          is_late?: boolean | null
          late_minutes?: number | null
          location_id?: string
          method?: string
          notes?: string | null
          shift_id?: string | null
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_logs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_logs_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_logs_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_field_attachments: {
        Row: {
          created_at: string
          created_by: string
          field_response_id: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          field_response_id: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          field_response_id?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_field_attachments_field_response_id_fkey"
            columns: ["field_response_id"]
            isOneToOne: false
            referencedRelation: "audit_field_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_field_photos: {
        Row: {
          caption: string | null
          created_at: string
          created_by: string
          field_response_id: string
          file_size: number | null
          id: string
          photo_url: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          created_by: string
          field_response_id: string
          file_size?: number | null
          id?: string
          photo_url: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          created_by?: string
          field_response_id?: string
          file_size?: number | null
          id?: string
          photo_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_field_photos_field_response_id_fkey"
            columns: ["field_response_id"]
            isOneToOne: false
            referencedRelation: "audit_field_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_field_responses: {
        Row: {
          audit_id: string
          created_at: string
          created_by: string
          field_id: string
          id: string
          observations: string | null
          response_value: Json | null
          section_id: string
          updated_at: string
        }
        Insert: {
          audit_id: string
          created_at?: string
          created_by: string
          field_id: string
          id?: string
          observations?: string | null
          response_value?: Json | null
          section_id: string
          updated_at?: string
        }
        Update: {
          audit_id?: string
          created_at?: string
          created_by?: string
          field_id?: string
          id?: string
          observations?: string | null
          response_value?: Json | null
          section_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_field_responses_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "location_audits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_field_responses_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "mv_audit_section_scores"
            referencedColumns: ["audit_id"]
          },
          {
            foreignKeyName: "audit_field_responses_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "audit_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_field_responses_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "audit_sections"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "audit_photos_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "mv_audit_section_scores"
            referencedColumns: ["audit_id"]
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
          {
            foreignKeyName: "audit_revisions_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "mv_audit_section_scores"
            referencedColumns: ["audit_id"]
          },
        ]
      }
      audit_section_responses: {
        Row: {
          audit_id: string
          created_at: string
          created_by: string
          follow_up_needed: boolean | null
          follow_up_notes: string | null
          id: string
          section_id: string
          updated_at: string
        }
        Insert: {
          audit_id: string
          created_at?: string
          created_by: string
          follow_up_needed?: boolean | null
          follow_up_notes?: string | null
          id?: string
          section_id: string
          updated_at?: string
        }
        Update: {
          audit_id?: string
          created_at?: string
          created_by?: string
          follow_up_needed?: boolean | null
          follow_up_notes?: string | null
          id?: string
          section_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_section_responses_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "location_audits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_section_responses_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "mv_audit_section_scores"
            referencedColumns: ["audit_id"]
          },
          {
            foreignKeyName: "audit_section_responses_section_id_fkey"
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
      audit_template_checkers: {
        Row: {
          created_at: string
          created_by: string
          id: string
          template_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          template_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          template_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_template_checkers_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "audit_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_templates: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          is_global: boolean
          location: string | null
          location_id: string | null
          name: string
          template_type: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_global?: boolean
          location?: string | null
          location_id?: string | null
          name: string
          template_type: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_global?: boolean
          location?: string | null
          location_id?: string | null
          name?: string
          template_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_templates_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      audits: {
        Row: {
          auditor_id: string
          company_id: string
          completed_at: string | null
          created_at: string
          id: string
          location_id: string
          scheduled_for: string | null
          started_at: string | null
          status: string
          template_id: string
          total_score: number | null
        }
        Insert: {
          auditor_id: string
          company_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          location_id: string
          scheduled_for?: string | null
          started_at?: string | null
          status?: string
          template_id: string
          total_score?: number | null
        }
        Update: {
          auditor_id?: string
          company_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          location_id?: string
          scheduled_for?: string | null
          started_at?: string | null
          status?: string
          template_id?: string
          total_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "audits_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audits_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audits_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "audit_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_events: {
        Row: {
          company_id: string
          created_at: string
          event_type: string
          id: string
          netopia_ntp_id: string | null
          netopia_order_id: string | null
          payload_json: Json
        }
        Insert: {
          company_id: string
          created_at?: string
          event_type: string
          id?: string
          netopia_ntp_id?: string | null
          netopia_order_id?: string | null
          payload_json?: Json
        }
        Update: {
          company_id?: string
          created_at?: string
          event_type?: string
          id?: string
          netopia_ntp_id?: string | null
          netopia_order_id?: string | null
          payload_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "billing_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_invoices: {
        Row: {
          amount: number
          attempt_count: number
          company_id: string
          created_at: string
          currency: string
          description: string | null
          id: string
          is_card_setup: boolean
          netopia_ntp_id: string | null
          netopia_order_id: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subscription_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          attempt_count?: number
          company_id: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_card_setup?: boolean
          netopia_ntp_id?: string | null
          netopia_order_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          attempt_count?: number
          company_id?: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_card_setup?: boolean
          netopia_ntp_id?: string | null
          netopia_order_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      clock_in_reminders: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string
          display_order: number | null
          id: string
          is_active: boolean | null
          message: string
          target_roles: string[] | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          message: string
          target_roles?: string[] | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          message?: string
          target_roles?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clock_in_reminders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cmms_asset_files: {
        Row: {
          asset_id: string
          caption: string | null
          created_at: string
          created_by: string
          file_type: string | null
          file_url: string
          id: string
        }
        Insert: {
          asset_id: string
          caption?: string | null
          created_at?: string
          created_by: string
          file_type?: string | null
          file_url: string
          id?: string
        }
        Update: {
          asset_id?: string
          caption?: string | null
          created_at?: string
          created_by?: string
          file_type?: string | null
          file_url?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cmms_asset_files_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "cmms_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      cmms_asset_procedures: {
        Row: {
          asset_id: string
          id: string
          is_default: boolean
          procedure_id: string
        }
        Insert: {
          asset_id: string
          id?: string
          is_default?: boolean
          procedure_id: string
        }
        Update: {
          asset_id?: string
          id?: string
          is_default?: boolean
          procedure_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cmms_asset_procedures_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "cmms_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cmms_asset_procedures_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "cmms_procedures"
            referencedColumns: ["id"]
          },
        ]
      }
      cmms_asset_tags: {
        Row: {
          asset_id: string
          id: string
          tag_id: string
        }
        Insert: {
          asset_id: string
          id?: string
          tag_id: string
        }
        Update: {
          asset_id?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cmms_asset_tags_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "cmms_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cmms_asset_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "cmms_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      cmms_assets: {
        Row: {
          asset_code: string
          brand: string | null
          category_id: string | null
          company_id: string
          created_at: string
          created_by: string
          criticality: string
          id: string
          is_archived: boolean
          location_id: string | null
          meter_current_value: number | null
          meter_type: string | null
          model: string | null
          name: string
          notes: string | null
          qr_token: string | null
          qr_url: string | null
          serial_number: string | null
          status: string
          updated_at: string
          warranty_expiry: string | null
          year: number | null
        }
        Insert: {
          asset_code: string
          brand?: string | null
          category_id?: string | null
          company_id: string
          created_at?: string
          created_by: string
          criticality?: string
          id?: string
          is_archived?: boolean
          location_id?: string | null
          meter_current_value?: number | null
          meter_type?: string | null
          model?: string | null
          name: string
          notes?: string | null
          qr_token?: string | null
          qr_url?: string | null
          serial_number?: string | null
          status?: string
          updated_at?: string
          warranty_expiry?: string | null
          year?: number | null
        }
        Update: {
          asset_code?: string
          brand?: string | null
          category_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          criticality?: string
          id?: string
          is_archived?: boolean
          location_id?: string | null
          meter_current_value?: number | null
          meter_type?: string | null
          model?: string | null
          name?: string
          notes?: string | null
          qr_token?: string | null
          qr_url?: string | null
          serial_number?: string | null
          status?: string
          updated_at?: string
          warranty_expiry?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cmms_assets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "asset_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cmms_assets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cmms_assets_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      cmms_audit_log: {
        Row: {
          action: string
          actor_user_id: string
          company_id: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata_json: Json | null
        }
        Insert: {
          action: string
          actor_user_id: string
          company_id: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata_json?: Json | null
        }
        Update: {
          action?: string
          actor_user_id?: string
          company_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "cmms_audit_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cmms_part_stock: {
        Row: {
          id: string
          location_id: string | null
          part_id: string
          qty_on_hand: number
          updated_at: string
        }
        Insert: {
          id?: string
          location_id?: string | null
          part_id: string
          qty_on_hand?: number
          updated_at?: string
        }
        Update: {
          id?: string
          location_id?: string | null
          part_id?: string
          qty_on_hand?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cmms_part_stock_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cmms_part_stock_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "cmms_parts"
            referencedColumns: ["id"]
          },
        ]
      }
      cmms_part_transactions: {
        Row: {
          created_at: string
          id: string
          location_id: string | null
          part_id: string
          performed_by: string
          qty_delta: number
          reason: string | null
          related_work_order_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          location_id?: string | null
          part_id: string
          performed_by: string
          qty_delta: number
          reason?: string | null
          related_work_order_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string | null
          part_id?: string
          performed_by?: string
          qty_delta?: number
          reason?: string | null
          related_work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cmms_part_transactions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cmms_part_transactions_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "cmms_parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cmms_part_transactions_related_work_order_id_fkey"
            columns: ["related_work_order_id"]
            isOneToOne: false
            referencedRelation: "cmms_work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      cmms_parts: {
        Row: {
          avg_unit_cost: number | null
          company_id: string
          created_at: string
          created_by: string
          id: string
          is_archived: boolean
          minimum_qty: number | null
          name: string
          photo_url: string | null
          reorder_qty: number | null
          sku: string | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          avg_unit_cost?: number | null
          company_id: string
          created_at?: string
          created_by: string
          id?: string
          is_archived?: boolean
          minimum_qty?: number | null
          name: string
          photo_url?: string | null
          reorder_qty?: number | null
          sku?: string | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          avg_unit_cost?: number | null
          company_id?: string
          created_at?: string
          created_by?: string
          id?: string
          is_archived?: boolean
          minimum_qty?: number | null
          name?: string
          photo_url?: string | null
          reorder_qty?: number | null
          sku?: string | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cmms_parts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cmms_pm_plans: {
        Row: {
          asset_id: string | null
          assigned_team_id: string | null
          assigned_user_id: string | null
          auto_create_work_order: boolean
          category_id: string | null
          company_id: string
          created_at: string
          created_by: string
          default_priority: string
          frequency_type: string
          frequency_value: number
          id: string
          is_archived: boolean
          location_id: string | null
          name: string
          next_due_at: string | null
          procedure_id: string | null
          scope_type: string
          tag_id: string | null
          updated_at: string
        }
        Insert: {
          asset_id?: string | null
          assigned_team_id?: string | null
          assigned_user_id?: string | null
          auto_create_work_order?: boolean
          category_id?: string | null
          company_id: string
          created_at?: string
          created_by: string
          default_priority?: string
          frequency_type: string
          frequency_value?: number
          id?: string
          is_archived?: boolean
          location_id?: string | null
          name: string
          next_due_at?: string | null
          procedure_id?: string | null
          scope_type: string
          tag_id?: string | null
          updated_at?: string
        }
        Update: {
          asset_id?: string | null
          assigned_team_id?: string | null
          assigned_user_id?: string | null
          auto_create_work_order?: boolean
          category_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          default_priority?: string
          frequency_type?: string
          frequency_value?: number
          id?: string
          is_archived?: boolean
          location_id?: string | null
          name?: string
          next_due_at?: string | null
          procedure_id?: string | null
          scope_type?: string
          tag_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cmms_pm_plans_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "cmms_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cmms_pm_plans_assigned_team_id_fkey"
            columns: ["assigned_team_id"]
            isOneToOne: false
            referencedRelation: "cmms_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cmms_pm_plans_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "asset_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cmms_pm_plans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cmms_pm_plans_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cmms_pm_plans_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "cmms_procedures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cmms_pm_plans_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "cmms_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      cmms_pm_runs: {
        Row: {
          generated_work_order_id: string | null
          id: string
          pm_plan_id: string
          run_at: string
          status: string
        }
        Insert: {
          generated_work_order_id?: string | null
          id?: string
          pm_plan_id: string
          run_at?: string
          status?: string
        }
        Update: {
          generated_work_order_id?: string | null
          id?: string
          pm_plan_id?: string
          run_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "cmms_pm_runs_generated_work_order_id_fkey"
            columns: ["generated_work_order_id"]
            isOneToOne: false
            referencedRelation: "cmms_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cmms_pm_runs_pm_plan_id_fkey"
            columns: ["pm_plan_id"]
            isOneToOne: false
            referencedRelation: "cmms_pm_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      cmms_procedure_files: {
        Row: {
          caption: string | null
          created_at: string
          created_by: string
          file_url: string
          id: string
          procedure_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          created_by: string
          file_url: string
          id?: string
          procedure_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          created_by?: string
          file_url?: string
          id?: string
          procedure_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cmms_procedure_files_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "cmms_procedures"
            referencedColumns: ["id"]
          },
        ]
      }
      cmms_procedure_steps: {
        Row: {
          choices_json: Json | null
          created_at: string
          id: string
          instruction_text: string | null
          procedure_id: string
          requires_photo: boolean
          requires_value: boolean
          step_order: number
          title: string
          updated_at: string
          value_type: string | null
        }
        Insert: {
          choices_json?: Json | null
          created_at?: string
          id?: string
          instruction_text?: string | null
          procedure_id: string
          requires_photo?: boolean
          requires_value?: boolean
          step_order: number
          title: string
          updated_at?: string
          value_type?: string | null
        }
        Update: {
          choices_json?: Json | null
          created_at?: string
          id?: string
          instruction_text?: string | null
          procedure_id?: string
          requires_photo?: boolean
          requires_value?: boolean
          step_order?: number
          title?: string
          updated_at?: string
          value_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cmms_procedure_steps_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "cmms_procedures"
            referencedColumns: ["id"]
          },
        ]
      }
      cmms_procedures: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          description: string | null
          estimated_minutes: number | null
          id: string
          is_archived: boolean
          is_published: boolean
          safety_notes: string | null
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          description?: string | null
          estimated_minutes?: number | null
          id?: string
          is_archived?: boolean
          is_published?: boolean
          safety_notes?: string | null
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          estimated_minutes?: number | null
          id?: string
          is_archived?: boolean
          is_published?: boolean
          safety_notes?: string | null
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "cmms_procedures_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cmms_purchase_order_items: {
        Row: {
          created_at: string
          id: string
          part_id: string
          purchase_order_id: string
          qty: number
          received_qty: number | null
          unit_cost: number
        }
        Insert: {
          created_at?: string
          id?: string
          part_id: string
          purchase_order_id: string
          qty: number
          received_qty?: number | null
          unit_cost?: number
        }
        Update: {
          created_at?: string
          id?: string
          part_id?: string
          purchase_order_id?: string
          qty?: number
          received_qty?: number | null
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "cmms_purchase_order_items_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "cmms_parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cmms_purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "cmms_purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      cmms_purchase_orders: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          expected_at: string | null
          id: string
          is_archived: boolean
          location_id: string | null
          notes: string | null
          po_number: number
          status: string
          total_cost: number | null
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          expected_at?: string | null
          id?: string
          is_archived?: boolean
          location_id?: string | null
          notes?: string | null
          po_number?: number
          status?: string
          total_cost?: number | null
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          expected_at?: string | null
          id?: string
          is_archived?: boolean
          location_id?: string | null
          notes?: string | null
          po_number?: number
          status?: string
          total_cost?: number | null
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cmms_purchase_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cmms_purchase_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cmms_purchase_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "cmms_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      cmms_reporting_snapshots: {
        Row: {
          company_id: string
          created_at: string
          date: string
          id: string
          location_id: string | null
          metrics_json: Json
        }
        Insert: {
          company_id: string
          created_at?: string
          date: string
          id?: string
          location_id?: string | null
          metrics_json?: Json
        }
        Update: {
          company_id?: string
          created_at?: string
          date?: string
          id?: string
          location_id?: string | null
          metrics_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "cmms_reporting_snapshots_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cmms_reporting_snapshots_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      cmms_tags: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "cmms_tags_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cmms_team_members: {
        Row: {
          created_at: string
          id: string
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cmms_team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "cmms_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      cmms_teams: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          id: string
          is_archived: boolean
          name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          id?: string
          is_archived?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          id?: string
          is_archived?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cmms_teams_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cmms_vendor_locations: {
        Row: {
          id: string
          location_id: string | null
          vendor_id: string
        }
        Insert: {
          id?: string
          location_id?: string | null
          vendor_id: string
        }
        Update: {
          id?: string
          location_id?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cmms_vendor_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cmms_vendor_locations_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "cmms_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      cmms_vendors: {
        Row: {
          company_id: string
          contact_name: string | null
          created_at: string
          created_by: string
          email: string | null
          id: string
          is_archived: boolean
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          contact_name?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          is_archived?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          contact_name?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          is_archived?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cmms_vendors_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cmms_work_order_checklist_responses: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          photo_url: string | null
          response_json: Json | null
          step_key: string
          updated_at: string
          work_order_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          photo_url?: string | null
          response_json?: Json | null
          step_key: string
          updated_at?: string
          work_order_id: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          photo_url?: string | null
          response_json?: Json | null
          step_key?: string
          updated_at?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cmms_work_order_checklist_responses_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "cmms_work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      cmms_work_order_comments: {
        Row: {
          comment_text: string
          created_at: string
          id: string
          user_id: string
          work_order_id: string
        }
        Insert: {
          comment_text: string
          created_at?: string
          id?: string
          user_id: string
          work_order_id: string
        }
        Update: {
          comment_text?: string
          created_at?: string
          id?: string
          user_id?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cmms_work_order_comments_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "cmms_work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      cmms_work_order_files: {
        Row: {
          caption: string | null
          created_at: string
          created_by: string
          file_url: string
          id: string
          work_order_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          created_by: string
          file_url: string
          id?: string
          work_order_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          created_by?: string
          file_url?: string
          id?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cmms_work_order_files_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "cmms_work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      cmms_work_order_status_history: {
        Row: {
          changed_at: string
          changed_by: string
          from_status: string | null
          id: string
          to_status: string
          work_order_id: string
        }
        Insert: {
          changed_at?: string
          changed_by: string
          from_status?: string | null
          id?: string
          to_status: string
          work_order_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string
          from_status?: string | null
          id?: string
          to_status?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cmms_work_order_status_history_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "cmms_work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      cmms_work_order_watchers: {
        Row: {
          created_at: string
          id: string
          user_id: string
          work_order_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          work_order_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cmms_work_order_watchers_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "cmms_work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      cmms_work_orders: {
        Row: {
          actual_minutes: number | null
          asset_id: string | null
          assigned_team_id: string | null
          assigned_user_id: string | null
          checklist_snapshot_json: Json | null
          company_id: string
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          due_at: string | null
          estimated_minutes: number | null
          id: string
          internal_notes: string | null
          is_archived: boolean
          labor_cost: number | null
          location_id: string | null
          parts_cost: number | null
          priority: string
          procedure_id: string | null
          started_at: string | null
          status: string
          title: string
          total_cost: number | null
          type: string
          updated_at: string
          wo_number: number
        }
        Insert: {
          actual_minutes?: number | null
          asset_id?: string | null
          assigned_team_id?: string | null
          assigned_user_id?: string | null
          checklist_snapshot_json?: Json | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_at?: string | null
          estimated_minutes?: number | null
          id?: string
          internal_notes?: string | null
          is_archived?: boolean
          labor_cost?: number | null
          location_id?: string | null
          parts_cost?: number | null
          priority?: string
          procedure_id?: string | null
          started_at?: string | null
          status?: string
          title: string
          total_cost?: number | null
          type?: string
          updated_at?: string
          wo_number?: number
        }
        Update: {
          actual_minutes?: number | null
          asset_id?: string | null
          assigned_team_id?: string | null
          assigned_user_id?: string | null
          checklist_snapshot_json?: Json | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_at?: string | null
          estimated_minutes?: number | null
          id?: string
          internal_notes?: string | null
          is_archived?: boolean
          labor_cost?: number | null
          location_id?: string | null
          parts_cost?: number | null
          priority?: string
          procedure_id?: string | null
          started_at?: string | null
          status?: string
          title?: string
          total_cost?: number | null
          type?: string
          updated_at?: string
          wo_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "cmms_work_orders_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "cmms_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cmms_work_orders_assigned_team_id_fkey"
            columns: ["assigned_team_id"]
            isOneToOne: false
            referencedRelation: "cmms_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cmms_work_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cmms_work_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cmms_work_orders_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "cmms_procedures"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          auto_clockout_delay_minutes: number | null
          clock_in_enabled: boolean
          created_at: string
          enable_schedule_governance: boolean
          hide_earnings_from_staff: boolean
          id: string
          industry_id: string | null
          is_paused: boolean
          logo_url: string | null
          name: string
          pause_reason: string | null
          paused_at: string | null
          slug: string
          status: string
          subscription_tier: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          auto_clockout_delay_minutes?: number | null
          clock_in_enabled?: boolean
          created_at?: string
          enable_schedule_governance?: boolean
          hide_earnings_from_staff?: boolean
          id?: string
          industry_id?: string | null
          is_paused?: boolean
          logo_url?: string | null
          name: string
          pause_reason?: string | null
          paused_at?: string | null
          slug: string
          status?: string
          subscription_tier?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          auto_clockout_delay_minutes?: number | null
          clock_in_enabled?: boolean
          created_at?: string
          enable_schedule_governance?: boolean
          hide_earnings_from_staff?: boolean
          id?: string
          industry_id?: string | null
          is_paused?: boolean
          logo_url?: string | null
          name?: string
          pause_reason?: string | null
          paused_at?: string | null
          slug?: string
          status?: string
          subscription_tier?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_industry_id_fkey"
            columns: ["industry_id"]
            isOneToOne: false
            referencedRelation: "industries"
            referencedColumns: ["id"]
          },
        ]
      }
      company_billing: {
        Row: {
          card_brand: string | null
          card_last_four: string | null
          company_id: string
          created_at: string
          current_period_end: string | null
          current_plan_id: string | null
          grace_period_ends_at: string | null
          id: string
          last_payment_error: string | null
          netopia_binding_token: string | null
          status: Database["public"]["Enums"]["billing_status"]
          updated_at: string
        }
        Insert: {
          card_brand?: string | null
          card_last_four?: string | null
          company_id: string
          created_at?: string
          current_period_end?: string | null
          current_plan_id?: string | null
          grace_period_ends_at?: string | null
          id?: string
          last_payment_error?: string | null
          netopia_binding_token?: string | null
          status?: Database["public"]["Enums"]["billing_status"]
          updated_at?: string
        }
        Update: {
          card_brand?: string | null
          card_last_four?: string | null
          company_id?: string
          created_at?: string
          current_period_end?: string | null
          current_plan_id?: string | null
          grace_period_ends_at?: string | null
          id?: string
          last_payment_error?: string | null
          netopia_binding_token?: string | null
          status?: Database["public"]["Enums"]["billing_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_billing_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_modules: {
        Row: {
          activated_at: string
          company_id: string
          deactivated_at: string | null
          id: string
          is_active: boolean
          module_name: string
        }
        Insert: {
          activated_at?: string
          company_id: string
          deactivated_at?: string | null
          id?: string
          is_active?: boolean
          module_name: string
        }
        Update: {
          activated_at?: string
          company_id?: string
          deactivated_at?: string | null
          id?: string
          is_active?: boolean
          module_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_modules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_role_permissions: {
        Row: {
          company_id: string
          company_role: string
          granted_at: string
          granted_by: string
          id: string
          permission: Database["public"]["Enums"]["company_permission"]
        }
        Insert: {
          company_id: string
          company_role: string
          granted_at?: string
          granted_by: string
          id?: string
          permission: Database["public"]["Enums"]["company_permission"]
        }
        Update: {
          company_id?: string
          company_role?: string
          granted_at?: string
          granted_by?: string
          id?: string
          permission?: Database["public"]["Enums"]["company_permission"]
        }
        Relationships: [
          {
            foreignKeyName: "company_role_permissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_users: {
        Row: {
          company_id: string
          company_role: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          company_id: string
          company_role: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          company_id?: string
          company_role?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      corrective_action_events: {
        Row: {
          actor_id: string
          company_id: string
          corrective_action_id: string
          created_at: string
          event_type: string
          id: string
          payload: Json | null
        }
        Insert: {
          actor_id: string
          company_id: string
          corrective_action_id: string
          created_at?: string
          event_type: string
          id?: string
          payload?: Json | null
        }
        Update: {
          actor_id?: string
          company_id?: string
          corrective_action_id?: string
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "corrective_action_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrective_action_events_corrective_action_id_fkey"
            columns: ["corrective_action_id"]
            isOneToOne: false
            referencedRelation: "corrective_actions"
            referencedColumns: ["id"]
          },
        ]
      }
      corrective_action_items: {
        Row: {
          assignee_role: string | null
          assignee_user_id: string | null
          company_id: string
          completed_at: string | null
          completed_by: string | null
          corrective_action_id: string
          created_at: string
          due_at: string
          evidence_packet_id: string | null
          evidence_required: boolean
          id: string
          instructions: string | null
          status: string
          title: string
          verification_notes: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          assignee_role?: string | null
          assignee_user_id?: string | null
          company_id: string
          completed_at?: string | null
          completed_by?: string | null
          corrective_action_id: string
          created_at?: string
          due_at: string
          evidence_packet_id?: string | null
          evidence_required?: boolean
          id?: string
          instructions?: string | null
          status?: string
          title: string
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          assignee_role?: string | null
          assignee_user_id?: string | null
          company_id?: string
          completed_at?: string | null
          completed_by?: string | null
          corrective_action_id?: string
          created_at?: string
          due_at?: string
          evidence_packet_id?: string | null
          evidence_required?: boolean
          id?: string
          instructions?: string | null
          status?: string
          title?: string
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "corrective_action_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrective_action_items_corrective_action_id_fkey"
            columns: ["corrective_action_id"]
            isOneToOne: false
            referencedRelation: "corrective_actions"
            referencedColumns: ["id"]
          },
        ]
      }
      corrective_action_rules: {
        Row: {
          company_id: string
          created_at: string | null
          enabled: boolean
          id: string
          name: string
          trigger_config: Json
          trigger_type: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          enabled?: boolean
          id?: string
          name: string
          trigger_config?: Json
          trigger_type: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          enabled?: boolean
          id?: string
          name?: string
          trigger_config?: Json
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "corrective_action_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      corrective_actions: {
        Row: {
          approval_role: string | null
          approved_at: string | null
          approved_by: string | null
          closed_at: string | null
          company_id: string
          created_at: string
          created_by: string
          description: string | null
          due_at: string
          id: string
          location_id: string
          owner_role: string | null
          owner_user_id: string | null
          requires_approval: boolean
          severity: string
          source_id: string
          source_type: string
          status: string
          stop_release_reason: string | null
          stop_released_at: string | null
          stop_released_by: string | null
          stop_the_line: boolean
          title: string
          updated_at: string
        }
        Insert: {
          approval_role?: string | null
          approved_at?: string | null
          approved_by?: string | null
          closed_at?: string | null
          company_id: string
          created_at?: string
          created_by: string
          description?: string | null
          due_at: string
          id?: string
          location_id: string
          owner_role?: string | null
          owner_user_id?: string | null
          requires_approval?: boolean
          severity?: string
          source_id: string
          source_type: string
          status?: string
          stop_release_reason?: string | null
          stop_released_at?: string | null
          stop_released_by?: string | null
          stop_the_line?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          approval_role?: string | null
          approved_at?: string | null
          approved_by?: string | null
          closed_at?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          due_at?: string
          id?: string
          location_id?: string
          owner_role?: string | null
          owner_user_id?: string | null
          requires_approval?: boolean
          severity?: string
          source_id?: string
          source_type?: string
          status?: string
          stop_release_reason?: string | null
          stop_released_at?: string | null
          stop_released_by?: string | null
          stop_the_line?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "corrective_actions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrective_actions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_requests: {
        Row: {
          company: string
          created_at: string
          email: string
          id: string
          locations: string
          message: string | null
          name: string
        }
        Insert: {
          company: string
          created_at?: string
          email: string
          id?: string
          locations: string
          message?: string | null
          name: string
        }
        Update: {
          company?: string
          created_at?: string
          email?: string
          id?: string
          locations?: string
          message?: string | null
          name?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          color: string | null
          company_id: string
          created_at: string | null
          created_by: string
          description: string | null
          display_order: number | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          company_id: string
          created_at?: string | null
          created_by: string
          description?: string | null
          display_order?: number | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string
          description?: string | null
          display_order?: number | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      document_categories: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          updated_at: string
          visible_to_roles: string[] | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          visible_to_roles?: string[] | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          visible_to_roles?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "document_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      document_reads: {
        Row: {
          confirmed_at: string | null
          confirmed_understood: boolean | null
          document_id: string
          id: string
          read_at: string
          staff_id: string | null
          user_id: string | null
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_understood?: boolean | null
          document_id: string
          id?: string
          read_at?: string
          staff_id?: string | null
          user_id?: string | null
        }
        Update: {
          confirmed_at?: string | null
          confirmed_understood?: boolean | null
          document_id?: string
          id?: string
          read_at?: string
          staff_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_reads_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_reads_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "upcoming_renewals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_reads_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category_id: string | null
          company_id: string | null
          created_at: string
          description: string | null
          document_type: string | null
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          location_id: string | null
          module_scope: string | null
          notification_email: string | null
          renewal_date: string | null
          required_reading: boolean | null
          title: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          category_id?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          document_type?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          location_id?: string | null
          module_scope?: string | null
          notification_email?: string | null
          renewal_date?: string | null
          required_reading?: boolean | null
          title: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          category_id?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          document_type?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          location_id?: string | null
          module_scope?: string | null
          notification_email?: string | null
          renewal_date?: string | null
          required_reading?: boolean | null
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
          {
            foreignKeyName: "documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_roles: {
        Row: {
          color: string | null
          company_id: string
          created_at: string
          created_by: string
          department_id: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          company_id: string
          created_at?: string
          created_by: string
          department_id?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          department_id?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_roles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_warning_views: {
        Row: {
          employee_id: string
          id: string
          seen_at: string
          warning_id: string
        }
        Insert: {
          employee_id: string
          id?: string
          seen_at?: string
          warning_id: string
        }
        Update: {
          employee_id?: string
          id?: string
          seen_at?: string
          warning_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_warning_views_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_warning_views_warning_id_fkey"
            columns: ["warning_id"]
            isOneToOne: false
            referencedRelation: "staff_events"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          annual_vacation_days: number | null
          avatar_url: string | null
          aviz_data_eliberare: string | null
          aviz_institutie: string | null
          base_salary: number | null
          cnp: string | null
          cod_cor: string | null
          company_id: string
          contract_type: string | null
          created_at: string
          created_by: string
          domiciliu: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emisa_de: string | null
          expected_shifts_per_week: number | null
          expected_weekly_hours: number | null
          full_name: string
          hire_date: string | null
          hourly_rate: number | null
          id: string
          is_foreign: boolean | null
          localitate: string | null
          location_id: string
          notes: string | null
          nr_permis_sedere: string | null
          numar_aviz: string | null
          numar_id: string | null
          ocupatia: string | null
          overtime_rate: number | null
          perioada_proba_end: string | null
          permis_data_eliberare: string | null
          permis_data_expirare: string | null
          permis_institutie_emitenta: string | null
          phone: string | null
          role: string
          serie_id: string | null
          spor_weekend: number | null
          status: string
          updated_at: string
          user_id: string | null
          vacation_year_start_month: number | null
          valabila_de_la: string | null
          valabilitate_id: string | null
          valoare_tichet: number | null
        }
        Insert: {
          annual_vacation_days?: number | null
          avatar_url?: string | null
          aviz_data_eliberare?: string | null
          aviz_institutie?: string | null
          base_salary?: number | null
          cnp?: string | null
          cod_cor?: string | null
          company_id: string
          contract_type?: string | null
          created_at?: string
          created_by: string
          domiciliu?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emisa_de?: string | null
          expected_shifts_per_week?: number | null
          expected_weekly_hours?: number | null
          full_name: string
          hire_date?: string | null
          hourly_rate?: number | null
          id?: string
          is_foreign?: boolean | null
          localitate?: string | null
          location_id: string
          notes?: string | null
          nr_permis_sedere?: string | null
          numar_aviz?: string | null
          numar_id?: string | null
          ocupatia?: string | null
          overtime_rate?: number | null
          perioada_proba_end?: string | null
          permis_data_eliberare?: string | null
          permis_data_expirare?: string | null
          permis_institutie_emitenta?: string | null
          phone?: string | null
          role: string
          serie_id?: string | null
          spor_weekend?: number | null
          status?: string
          updated_at?: string
          user_id?: string | null
          vacation_year_start_month?: number | null
          valabila_de_la?: string | null
          valabilitate_id?: string | null
          valoare_tichet?: number | null
        }
        Update: {
          annual_vacation_days?: number | null
          avatar_url?: string | null
          aviz_data_eliberare?: string | null
          aviz_institutie?: string | null
          base_salary?: number | null
          cnp?: string | null
          cod_cor?: string | null
          company_id?: string
          contract_type?: string | null
          created_at?: string
          created_by?: string
          domiciliu?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emisa_de?: string | null
          expected_shifts_per_week?: number | null
          expected_weekly_hours?: number | null
          full_name?: string
          hire_date?: string | null
          hourly_rate?: number | null
          id?: string
          is_foreign?: boolean | null
          localitate?: string | null
          location_id?: string
          notes?: string | null
          nr_permis_sedere?: string | null
          numar_aviz?: string | null
          numar_id?: string | null
          ocupatia?: string | null
          overtime_rate?: number | null
          perioada_proba_end?: string | null
          permis_data_eliberare?: string | null
          permis_data_expirare?: string | null
          permis_institutie_emitenta?: string | null
          phone?: string | null
          role?: string
          serie_id?: string | null
          spor_weekend?: number | null
          status?: string
          updated_at?: string
          user_id?: string | null
          vacation_year_start_month?: number | null
          valabila_de_la?: string | null
          valabilitate_id?: string | null
          valoare_tichet?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          date_added: string
          id: string
          last_check_date: string | null
          last_check_notes: string | null
          location_id: string
          model_type: string | null
          name: string
          next_check_date: string | null
          power_consumption: string | null
          power_supply_type: string | null
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          date_added?: string
          id?: string
          last_check_date?: string | null
          last_check_notes?: string | null
          location_id: string
          model_type?: string | null
          name: string
          next_check_date?: string | null
          power_consumption?: string | null
          power_supply_type?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          date_added?: string
          id?: string
          last_check_date?: string | null
          last_check_notes?: string | null
          location_id?: string
          model_type?: string | null
          name?: string
          next_check_date?: string | null
          power_consumption?: string | null
          power_supply_type?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_checks: {
        Row: {
          check_date: string
          created_at: string
          equipment_id: string
          id: string
          notes: string | null
          performed_by: string
          result_status: string
        }
        Insert: {
          check_date: string
          created_at?: string
          equipment_id: string
          id?: string
          notes?: string | null
          performed_by: string
          result_status: string
        }
        Update: {
          check_date?: string
          created_at?: string
          equipment_id?: string
          id?: string
          notes?: string | null
          performed_by?: string
          result_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_checks_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_documents: {
        Row: {
          created_at: string
          equipment_id: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          equipment_id: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          equipment_id?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_documents_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_interventions: {
        Row: {
          after_photo_url: string | null
          before_photo_url: string | null
          company_id: string | null
          created_at: string
          created_by: string
          description: string | null
          equipment_id: string
          id: string
          location_id: string
          next_check_date: string | null
          notes: string | null
          performed_at: string | null
          performed_by_user_id: string
          scheduled_for: string
          status: string
          supervised_by_user_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          after_photo_url?: string | null
          before_photo_url?: string | null
          company_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          equipment_id: string
          id?: string
          location_id: string
          next_check_date?: string | null
          notes?: string | null
          performed_at?: string | null
          performed_by_user_id: string
          scheduled_for: string
          status?: string
          supervised_by_user_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          after_photo_url?: string | null
          before_photo_url?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          equipment_id?: string
          id?: string
          location_id?: string
          next_check_date?: string | null
          notes?: string | null
          performed_at?: string | null
          performed_by_user_id?: string
          scheduled_for?: string
          status?: string
          supervised_by_user_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_interventions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_interventions_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_interventions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_interventions_performed_by_user_id_fkey"
            columns: ["performed_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_interventions_supervised_by_user_id_fkey"
            columns: ["supervised_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_maintenance_events: {
        Row: {
          attachments: Json | null
          cost: number | null
          created_at: string
          description: string
          equipment_id: string
          event_date: string
          id: string
          parts_used: Json | null
          technician: string
        }
        Insert: {
          attachments?: Json | null
          cost?: number | null
          created_at?: string
          description: string
          equipment_id: string
          event_date: string
          id?: string
          parts_used?: Json | null
          technician: string
        }
        Update: {
          attachments?: Json | null
          cost?: number | null
          created_at?: string
          description?: string
          equipment_id?: string
          event_date?: string
          id?: string
          parts_used?: Json | null
          technician?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_maintenance_events_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_status_history: {
        Row: {
          changed_at: string
          changed_by: string
          created_at: string
          equipment_id: string
          id: string
          new_status: string
          notes: string | null
          old_status: string | null
        }
        Insert: {
          changed_at?: string
          changed_by: string
          created_at?: string
          equipment_id: string
          id?: string
          new_status: string
          notes?: string | null
          old_status?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string
          created_at?: string
          equipment_id?: string
          id?: string
          new_status?: string
          notes?: string | null
          old_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_status_history_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_events: {
        Row: {
          actor_id: string
          company_id: string
          created_at: string
          event_type: string
          from_status: string | null
          id: string
          packet_id: string
          payload: Json | null
          to_status: string | null
        }
        Insert: {
          actor_id: string
          company_id: string
          created_at?: string
          event_type: string
          from_status?: string | null
          id?: string
          packet_id: string
          payload?: Json | null
          to_status?: string | null
        }
        Update: {
          actor_id?: string
          company_id?: string
          created_at?: string
          event_type?: string
          from_status?: string | null
          id?: string
          packet_id?: string
          payload?: Json | null
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evidence_events_packet_id_fkey"
            columns: ["packet_id"]
            isOneToOne: false
            referencedRelation: "evidence_packets"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_media: {
        Row: {
          company_id: string
          created_at: string
          id: string
          media_type: string
          mime_type: string | null
          packet_id: string
          sha256: string | null
          size_bytes: number | null
          storage_path: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          media_type: string
          mime_type?: string | null
          packet_id: string
          sha256?: string | null
          size_bytes?: number | null
          storage_path: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          media_type?: string
          mime_type?: string | null
          packet_id?: string
          sha256?: string | null
          size_bytes?: number | null
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_media_packet_id_fkey"
            columns: ["packet_id"]
            isOneToOne: false
            referencedRelation: "evidence_packets"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_packets: {
        Row: {
          client_captured_at: string | null
          company_id: string
          created_at: string
          created_by: string
          device_info: Json | null
          id: string
          location_id: string
          notes: string | null
          redacted_at: string | null
          redacted_by: string | null
          redaction_reason: string | null
          review_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          subject_id: string
          subject_item_id: string | null
          subject_type: string
          submitted_at: string | null
          tags: string[] | null
          version: number
        }
        Insert: {
          client_captured_at?: string | null
          company_id: string
          created_at?: string
          created_by: string
          device_info?: Json | null
          id?: string
          location_id: string
          notes?: string | null
          redacted_at?: string | null
          redacted_by?: string | null
          redaction_reason?: string | null
          review_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          subject_id: string
          subject_item_id?: string | null
          subject_type: string
          submitted_at?: string | null
          tags?: string[] | null
          version?: number
        }
        Update: {
          client_captured_at?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          device_info?: Json | null
          id?: string
          location_id?: string
          notes?: string | null
          redacted_at?: string | null
          redacted_by?: string | null
          redaction_reason?: string | null
          review_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          subject_id?: string
          subject_item_id?: string | null
          subject_type?: string
          submitted_at?: string | null
          tags?: string[] | null
          version?: number
        }
        Relationships: []
      }
      evidence_policies: {
        Row: {
          applies_id: string
          applies_to: string
          company_id: string
          created_at: string
          evidence_required: boolean
          id: string
          instructions: string | null
          location_id: string | null
          min_media_count: number
          required_media_types: string[] | null
          review_required: boolean
        }
        Insert: {
          applies_id: string
          applies_to: string
          company_id: string
          created_at?: string
          evidence_required?: boolean
          id?: string
          instructions?: string | null
          location_id?: string | null
          min_media_count?: number
          required_media_types?: string[] | null
          review_required?: boolean
        }
        Update: {
          applies_id?: string
          applies_to?: string
          company_id?: string
          created_at?: string
          evidence_required?: boolean
          id?: string
          instructions?: string | null
          location_id?: string | null
          min_media_count?: number
          required_media_types?: string[] | null
          review_required?: boolean
        }
        Relationships: []
      }
      form_categories: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          display_order: number
          id: string
          is_active: boolean
          name: string
          slug: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          slug: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submission_audit: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          id: string
          new_value: Json | null
          old_value: Json | null
          path: string | null
          submission_id: string
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          path?: string | null
          submission_id: string
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          path?: string | null
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_submission_audit_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "form_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          company_id: string
          created_at: string
          data: Json
          id: string
          location_form_template_id: string
          location_id: string
          period_month: number | null
          period_year: number | null
          status: string
          submitted_at: string | null
          submitted_by: string
          template_id: string
          template_version_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          data?: Json
          id?: string
          location_form_template_id: string
          location_id: string
          period_month?: number | null
          period_year?: number | null
          status?: string
          submitted_at?: string | null
          submitted_by: string
          template_id: string
          template_version_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          data?: Json
          id?: string
          location_form_template_id?: string
          location_id?: string
          period_month?: number | null
          period_year?: number | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string
          template_id?: string
          template_version_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_location_form_template_id_fkey"
            columns: ["location_form_template_id"]
            isOneToOne: false
            referencedRelation: "location_form_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "form_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_template_version_id_fkey"
            columns: ["template_version_id"]
            isOneToOne: false
            referencedRelation: "form_template_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      form_template_versions: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          notes: string | null
          schema: Json
          template_id: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          notes?: string | null
          schema?: Json
          template_id: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          schema?: Json
          template_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "form_template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "form_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      form_templates: {
        Row: {
          category: string
          company_id: string
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          category?: string
          company_id: string
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          category?: string
          company_id?: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      industries: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      insight_summaries: {
        Row: {
          company_id: string
          content: Json
          content_html: string | null
          generated_at: string
          generated_by: string | null
          id: string
          period_end: string
          period_start: string
          summary_type: string
        }
        Insert: {
          company_id: string
          content: Json
          content_html?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          period_end: string
          period_start: string
          summary_type: string
        }
        Update: {
          company_id?: string
          content?: Json
          content_html?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          period_end?: string
          period_start?: string
          summary_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "insight_summaries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_settings: {
        Row: {
          created_at: string
          id: string
          integration_id: string
          is_secret: boolean | null
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          integration_id: string
          is_secret?: boolean | null
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          integration_id?: string
          is_secret?: boolean | null
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_settings_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          integration_type: string
          last_error: string | null
          last_sync_at: string | null
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          integration_type: string
          last_error?: string | null
          last_sync_at?: string | null
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          integration_type?: string
          last_error?: string | null
          last_sync_at?: string | null
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          category: string | null
          company_id: string
          created_at: string
          created_by: string
          id: string
          name: string
          par_level: number | null
          typical_storage_location: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          company_id: string
          created_at?: string
          created_by: string
          id?: string
          name: string
          par_level?: number | null
          typical_storage_location?: string | null
          unit: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          par_level?: number | null
          typical_storage_location?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_snapshot_lines: {
        Row: {
          counted_qty: number
          created_at: string
          estimated_cost: number | null
          id: string
          item_id: string
          notes: string | null
          photo_url: string | null
          snapshot_id: string
        }
        Insert: {
          counted_qty: number
          created_at?: string
          estimated_cost?: number | null
          id?: string
          item_id: string
          notes?: string | null
          photo_url?: string | null
          snapshot_id: string
        }
        Update: {
          counted_qty?: number
          created_at?: string
          estimated_cost?: number | null
          id?: string
          item_id?: string
          notes?: string | null
          photo_url?: string | null
          snapshot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_snapshot_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_snapshot_lines_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "inventory_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_snapshots: {
        Row: {
          company_id: string
          id: string
          location_id: string
          notes: string | null
          snapshot_date: string
          status: string
          taken_at: string
          taken_by: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          company_id: string
          id?: string
          location_id: string
          notes?: string | null
          snapshot_date?: string
          status?: string
          taken_at?: string
          taken_by: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          company_id?: string
          id?: string
          location_id?: string
          notes?: string | null
          snapshot_date?: string
          status?: string
          taken_at?: string
          taken_by?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_snapshots_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_snapshots_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_lines: {
        Row: {
          created_at: string
          id: string
          invoice_id: string
          item_id: string | null
          item_name_raw: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_id: string
          item_id?: string | null
          item_name_raw: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          invoice_id?: string
          item_id?: string | null
          item_name_raw?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          company_id: string
          created_at: string
          file_url: string | null
          id: string
          invoice_date: string
          invoice_number: string | null
          parsed_status: string
          supplier_id: string | null
          total_amount: number | null
          uploaded_by: string
        }
        Insert: {
          company_id: string
          created_at?: string
          file_url?: string | null
          id?: string
          invoice_date: string
          invoice_number?: string | null
          parsed_status?: string
          supplier_id?: string | null
          total_amount?: number | null
          uploaded_by: string
        }
        Update: {
          company_id?: string
          created_at?: string
          file_url?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string | null
          parsed_status?: string
          supplier_id?: string | null
          total_amount?: number | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      labor_costs: {
        Row: {
          actual_cost: number | null
          actual_hours: number | null
          actual_sales: number | null
          company_id: string
          created_at: string
          date: string
          id: string
          location_id: string
          projected_sales: number | null
          scheduled_cost: number | null
          scheduled_hours: number | null
          updated_at: string
        }
        Insert: {
          actual_cost?: number | null
          actual_hours?: number | null
          actual_sales?: number | null
          company_id: string
          created_at?: string
          date: string
          id?: string
          location_id: string
          projected_sales?: number | null
          scheduled_cost?: number | null
          scheduled_hours?: number | null
          updated_at?: string
        }
        Update: {
          actual_cost?: number | null
          actual_hours?: number | null
          actual_sales?: number | null
          company_id?: string
          created_at?: string
          date?: string
          id?: string
          location_id?: string
          projected_sales?: number | null
          scheduled_cost?: number | null
          scheduled_hours?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "labor_costs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_costs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      location_audits: {
        Row: {
          assigned_user_id: string | null
          audit_date: string
          boh_equipment: number | null
          boh_preparation: number | null
          boh_storage: number | null
          boh_temperature: number | null
          cached_section_scores: Json | null
          cleaning_equipment: number | null
          cleaning_floors: number | null
          cleaning_surfaces: number | null
          cleaning_waste: number | null
          company_id: string | null
          compliance_documentation: number | null
          compliance_licenses: number | null
          compliance_permits: number | null
          compliance_signage: number | null
          created_at: string
          custom_data: Json | null
          draft_key: string | null
          foh_customer_areas: number | null
          foh_menu_boards: number | null
          foh_restrooms: number | null
          foh_seating: number | null
          id: string
          location: string
          location_id: string | null
          notes: string | null
          overall_score: number | null
          scheduled_end: string | null
          scheduled_start: string | null
          status: string | null
          template_id: string | null
          time_end: string | null
          time_start: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_user_id?: string | null
          audit_date: string
          boh_equipment?: number | null
          boh_preparation?: number | null
          boh_storage?: number | null
          boh_temperature?: number | null
          cached_section_scores?: Json | null
          cleaning_equipment?: number | null
          cleaning_floors?: number | null
          cleaning_surfaces?: number | null
          cleaning_waste?: number | null
          company_id?: string | null
          compliance_documentation?: number | null
          compliance_licenses?: number | null
          compliance_permits?: number | null
          compliance_signage?: number | null
          created_at?: string
          custom_data?: Json | null
          draft_key?: string | null
          foh_customer_areas?: number | null
          foh_menu_boards?: number | null
          foh_restrooms?: number | null
          foh_seating?: number | null
          id?: string
          location: string
          location_id?: string | null
          notes?: string | null
          overall_score?: number | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          status?: string | null
          template_id?: string | null
          time_end?: string | null
          time_start?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_user_id?: string | null
          audit_date?: string
          boh_equipment?: number | null
          boh_preparation?: number | null
          boh_storage?: number | null
          boh_temperature?: number | null
          cached_section_scores?: Json | null
          cleaning_equipment?: number | null
          cleaning_floors?: number | null
          cleaning_surfaces?: number | null
          cleaning_waste?: number | null
          company_id?: string | null
          compliance_documentation?: number | null
          compliance_licenses?: number | null
          compliance_permits?: number | null
          compliance_signage?: number | null
          created_at?: string
          custom_data?: Json | null
          draft_key?: string | null
          foh_customer_areas?: number | null
          foh_menu_boards?: number | null
          foh_restrooms?: number | null
          foh_seating?: number | null
          id?: string
          location?: string
          location_id?: string | null
          notes?: string | null
          overall_score?: number | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          status?: string | null
          template_id?: string | null
          time_end?: string | null
          time_start?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_audits_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_audits_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_audits_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_audits_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "audit_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      location_daily_ops: {
        Row: {
          checklist_json: Json
          company_id: string
          created_at: string
          date: string
          id: string
          issues_found_json: Json | null
          location_health_score: number | null
          location_id: string
          status: string
          updated_at: string
        }
        Insert: {
          checklist_json?: Json
          company_id: string
          created_at?: string
          date: string
          id?: string
          issues_found_json?: Json | null
          location_health_score?: number | null
          location_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          checklist_json?: Json
          company_id?: string
          created_at?: string
          date?: string
          id?: string
          issues_found_json?: Json | null
          location_health_score?: number | null
          location_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_daily_ops_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_daily_ops_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      location_form_templates: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          location_id: string
          overrides: Json | null
          public_token: string
          template_id: string
          template_version_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          location_id: string
          overrides?: Json | null
          public_token?: string
          template_id: string
          template_version_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          location_id?: string
          overrides?: Json | null
          public_token?: string
          template_id?: string
          template_version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_form_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_form_templates_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_form_templates_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "form_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_form_templates_template_version_id_fkey"
            columns: ["template_version_id"]
            isOneToOne: false
            referencedRelation: "form_template_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      location_operating_schedules: {
        Row: {
          close_time: string
          created_at: string
          created_by: string
          day_of_week: number
          id: string
          is_closed: boolean
          location_id: string
          open_time: string
          updated_at: string
        }
        Insert: {
          close_time: string
          created_at?: string
          created_by: string
          day_of_week: number
          id?: string
          is_closed?: boolean
          location_id: string
          open_time: string
          updated_at?: string
        }
        Update: {
          close_time?: string
          created_at?: string
          created_by?: string
          day_of_week?: number
          id?: string
          is_closed?: boolean
          location_id?: string
          open_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_operating_schedules_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      location_risk_state: {
        Row: {
          company_id: string
          is_restricted: boolean
          location_id: string
          restricted_ca_id: string | null
          restricted_reason: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          is_restricted?: boolean
          location_id: string
          restricted_ca_id?: string | null
          restricted_reason?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          is_restricted?: boolean
          location_id?: string
          restricted_ca_id?: string | null
          restricted_reason?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "location_risk_state_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_risk_state_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_risk_state_restricted_ca_id_fkey"
            columns: ["restricted_ca_id"]
            isOneToOne: false
            referencedRelation: "corrective_actions"
            referencedColumns: ["id"]
          },
        ]
      }
      location_sla_configs: {
        Row: {
          active: boolean
          company_id: string
          created_at: string
          description: string | null
          id: string
          location_id: string | null
          rules_json: Json
          sla_name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          location_id?: string | null
          rules_json?: Json
          sla_name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          location_id?: string | null
          rules_json?: Json
          sla_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_sla_configs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_sla_configs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          city: string | null
          company_id: string
          created_at: string
          created_by: string
          id: string
          latitude: number | null
          longitude: number | null
          manager_id: string | null
          name: string
          requires_checkin: boolean | null
          status: string
          type: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_id: string
          created_at?: string
          created_by: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          manager_id?: string | null
          name: string
          requires_checkin?: boolean | null
          status?: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          manager_id?: string | null
          name?: string
          requires_checkin?: boolean | null
          status?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_tasks: {
        Row: {
          company_id: string
          completed_at: string | null
          created_at: string
          created_by_agent: boolean
          equipment_id: string | null
          id: string
          location_id: string
          notes: string | null
          scheduled_for: string
          status: string
          task_type: string
          updated_at: string
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          created_at?: string
          created_by_agent?: boolean
          equipment_id?: string | null
          id?: string
          location_id: string
          notes?: string | null
          scheduled_for: string
          status?: string
          task_type: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          created_at?: string
          created_by_agent?: boolean
          equipment_id?: string | null
          id?: string
          location_id?: string
          notes?: string | null
          scheduled_for?: string
          status?: string
          task_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tasks_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tasks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_metrics: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string
          id: string
          location_id: string | null
          metric_date: string
          metric_name: string
          metric_value: number
          notes: string | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          location_id?: string | null
          metric_date: string
          metric_name: string
          metric_value: number
          notes?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          location_id?: string | null
          metric_date?: string
          metric_name?: string
          metric_value?: number
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_metrics_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_metrics_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          name: string
          parent_id: string | null
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          name: string
          parent_id?: string | null
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "marketplace_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_downloads: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          installed_template_id: string | null
          template_id: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          installed_template_id?: string | null
          template_id: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          installed_template_id?: string | null
          template_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_downloads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_downloads_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "marketplace_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_ratings: {
        Row: {
          created_at: string
          id: string
          rating: number
          review: string | null
          template_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          rating: number
          review?: string | null
          template_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          rating?: number
          review?: string | null
          template_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_ratings_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "marketplace_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_templates: {
        Row: {
          author_company_name: string | null
          author_id: string
          author_name: string
          average_rating: number | null
          category_id: string | null
          content: Json
          created_at: string
          description: string | null
          download_count: number
          id: string
          industry_id: string | null
          is_ai_generated: boolean
          is_featured: boolean
          is_published: boolean
          preview_image_url: string | null
          published_at: string | null
          rating_count: number
          rating_sum: number
          share_token: string
          slug: string
          template_type: string
          title: string
          updated_at: string
          version: string
        }
        Insert: {
          author_company_name?: string | null
          author_id: string
          author_name: string
          average_rating?: number | null
          category_id?: string | null
          content?: Json
          created_at?: string
          description?: string | null
          download_count?: number
          id?: string
          industry_id?: string | null
          is_ai_generated?: boolean
          is_featured?: boolean
          is_published?: boolean
          preview_image_url?: string | null
          published_at?: string | null
          rating_count?: number
          rating_sum?: number
          share_token?: string
          slug: string
          template_type: string
          title: string
          updated_at?: string
          version?: string
        }
        Update: {
          author_company_name?: string | null
          author_id?: string
          author_name?: string
          average_rating?: number | null
          category_id?: string | null
          content?: Json
          created_at?: string
          description?: string | null
          download_count?: number
          id?: string
          industry_id?: string | null
          is_ai_generated?: boolean
          is_featured?: boolean
          is_published?: boolean
          preview_image_url?: string | null
          published_at?: string | null
          rating_count?: number
          rating_sum?: number
          share_token?: string
          slug?: string
          template_type?: string
          title?: string
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "marketplace_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_templates_industry_id_fkey"
            columns: ["industry_id"]
            isOneToOne: false
            referencedRelation: "industries"
            referencedColumns: ["id"]
          },
        ]
      }
      module_industries: {
        Row: {
          created_at: string
          id: string
          industry_id: string
          module_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          industry_id: string
          module_id: string
        }
        Update: {
          created_at?: string
          id?: string
          industry_id?: string
          module_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_industries_industry_id_fkey"
            columns: ["industry_id"]
            isOneToOne: false
            referencedRelation: "industries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_industries_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          base_price: number | null
          code: string
          created_at: string
          description: string | null
          icon_name: string | null
          id: string
          industry_scope: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          base_price?: number | null
          code: string
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          industry_scope: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          base_price?: number | null
          code?: string
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          industry_scope?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      mystery_shopper_questions: {
        Row: {
          created_at: string
          id: string
          is_required: boolean
          options: Json | null
          order_index: number
          question_text: string
          question_type: string
          rating_scale: Json | null
          template_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_required?: boolean
          options?: Json | null
          order_index?: number
          question_text: string
          question_type: string
          rating_scale?: Json | null
          template_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_required?: boolean
          options?: Json | null
          order_index?: number
          question_text?: string
          question_type?: string
          rating_scale?: Json | null
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mystery_shopper_questions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "mystery_shopper_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      mystery_shopper_submissions: {
        Row: {
          company_id: string
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          id: string
          location_id: string | null
          overall_score: number | null
          raw_answers: Json
          submitted_at: string
          template_id: string
          voucher_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          id?: string
          location_id?: string | null
          overall_score?: number | null
          raw_answers?: Json
          submitted_at?: string
          template_id: string
          voucher_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          id?: string
          location_id?: string | null
          overall_score?: number | null
          raw_answers?: Json
          submitted_at?: string
          template_id?: string
          voucher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mystery_shopper_submissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mystery_shopper_submissions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mystery_shopper_submissions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "mystery_shopper_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mystery_shopper_submissions_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      mystery_shopper_templates: {
        Row: {
          brand_logo_url: string | null
          company_id: string
          created_at: string
          default_location_ids: string[] | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          public_token: string
          require_contact: boolean
          updated_at: string
          voucher_currency: string
          voucher_expiry_days: number
          voucher_terms_text: string | null
          voucher_value: number
        }
        Insert: {
          brand_logo_url?: string | null
          company_id: string
          created_at?: string
          default_location_ids?: string[] | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          public_token?: string
          require_contact?: boolean
          updated_at?: string
          voucher_currency?: string
          voucher_expiry_days?: number
          voucher_terms_text?: string | null
          voucher_value?: number
        }
        Update: {
          brand_logo_url?: string | null
          company_id?: string
          created_at?: string
          default_location_ids?: string[] | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          public_token?: string
          require_contact?: boolean
          updated_at?: string
          voucher_currency?: string
          voucher_expiry_days?: number
          voucher_terms_text?: string | null
          voucher_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "mystery_shopper_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
          company_id: string | null
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
          company_id?: string | null
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
          company_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "notification_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          audit_id: string | null
          company_id: string | null
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
          target_employee_ids: string[] | null
          target_roles: string[] | null
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          audit_id?: string | null
          company_id?: string | null
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
          target_employee_ids?: string[] | null
          target_roles?: string[] | null
          title: string
          type?: string
          updated_at?: string | null
        }
        Update: {
          audit_id?: string | null
          company_id?: string | null
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
          target_employee_ids?: string[] | null
          target_roles?: string[] | null
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
          {
            foreignKeyName: "notifications_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "mv_audit_section_scores"
            referencedColumns: ["audit_id"]
          },
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_batches: {
        Row: {
          company_id: string
          created_at: string
          created_by_agent: boolean
          id: string
          period_end: string
          period_start: string
          status: string
          summary_json: Json | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by_agent?: boolean
          id?: string
          period_end: string
          period_start: string
          status?: string
          summary_json?: Json | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by_agent?: boolean
          id?: string
          period_end?: string
          period_start?: string
          status?: string
          summary_json?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_batches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_items: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          hours: number | null
          id: string
          metadata: Json | null
          period_id: string
          rate: number | null
          staff_id: string
          type: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          hours?: number | null
          id?: string
          metadata?: Json | null
          period_id: string
          rate?: number | null
          staff_id: string
          type: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          hours?: number | null
          id?: string
          metadata?: Json | null
          period_id?: string
          rate?: number | null
          staff_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_items_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_items_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_periods: {
        Row: {
          closed_at: string | null
          company_id: string
          created_at: string
          created_by: string
          end_date: string
          id: string
          start_date: string
          status: string
          total_amount: number | null
        }
        Insert: {
          closed_at?: string | null
          company_id: string
          created_at?: string
          created_by: string
          end_date: string
          id?: string
          start_date: string
          status?: string
          total_amount?: number | null
        }
        Update: {
          closed_at?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          end_date?: string
          id?: string
          start_date?: string
          status?: string
          total_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_periods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_audit_log: {
        Row: {
          action: string
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_audit_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_rule_evaluations: {
        Row: {
          action: string
          company_id: string
          context_json: Json | null
          evaluated_at: string
          id: string
          resource: string
          result: string
          rule_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          company_id: string
          context_json?: Json | null
          evaluated_at?: string
          id?: string
          resource: string
          result: string
          rule_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          company_id?: string
          context_json?: Json | null
          evaluated_at?: string
          id?: string
          resource?: string
          result?: string
          rule_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_rule_evaluations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_rule_evaluations_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "policy_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_rules: {
        Row: {
          action: string
          company_id: string
          condition_config: Json
          condition_type: string
          created_at: string
          created_by: string | null
          description: string | null
          enforcement: string
          id: string
          is_active: boolean
          name: string
          priority: number
          resource: string
          updated_at: string
        }
        Insert: {
          action: string
          company_id: string
          condition_config?: Json
          condition_type: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          enforcement?: string
          id?: string
          is_active?: boolean
          name: string
          priority?: number
          resource: string
          updated_at?: string
        }
        Update: {
          action?: string
          company_id?: string
          condition_config?: Json
          condition_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          enforcement?: string
          id?: string
          is_active?: boolean
          name?: string
          priority?: number
          resource?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
          preferred_language: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          last_login?: string | null
          preferred_language?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          last_login?: string | null
          preferred_language?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      recurring_audit_schedules: {
        Row: {
          assigned_user_id: string
          created_at: string
          created_by: string
          day_of_month: number | null
          day_of_week: number | null
          duration_hours: number
          end_date: string | null
          id: string
          is_active: boolean
          last_generated_date: string | null
          location_id: string
          name: string
          notes: string | null
          recurrence_pattern: string
          start_date: string
          start_time: string
          template_id: string
          updated_at: string
        }
        Insert: {
          assigned_user_id: string
          created_at?: string
          created_by: string
          day_of_month?: number | null
          day_of_week?: number | null
          duration_hours?: number
          end_date?: string | null
          id?: string
          is_active?: boolean
          last_generated_date?: string | null
          location_id: string
          name: string
          notes?: string | null
          recurrence_pattern: string
          start_date: string
          start_time: string
          template_id: string
          updated_at?: string
        }
        Update: {
          assigned_user_id?: string
          created_at?: string
          created_by?: string
          day_of_month?: number | null
          day_of_week?: number | null
          duration_hours?: number
          end_date?: string | null
          id?: string
          is_active?: boolean
          last_generated_date?: string | null
          location_id?: string
          name?: string
          notes?: string | null
          recurrence_pattern?: string
          start_date?: string
          start_time?: string
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_audit_schedules_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_audit_schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_audit_schedules_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_audit_schedules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "audit_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_maintenance_schedules: {
        Row: {
          assigned_user_id: string
          created_at: string
          created_by: string
          day_of_month: number | null
          day_of_week: number | null
          description: string | null
          end_date: string | null
          equipment_id: string
          id: string
          is_active: boolean
          last_generated_date: string | null
          location_id: string
          recurrence_pattern: string
          start_date: string
          start_time: string
          supervisor_user_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_user_id: string
          created_at?: string
          created_by: string
          day_of_month?: number | null
          day_of_week?: number | null
          description?: string | null
          end_date?: string | null
          equipment_id: string
          id?: string
          is_active?: boolean
          last_generated_date?: string | null
          location_id: string
          recurrence_pattern: string
          start_date: string
          start_time: string
          supervisor_user_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_user_id?: string
          created_at?: string
          created_by?: string
          day_of_month?: number | null
          day_of_week?: number | null
          description?: string | null
          end_date?: string | null
          equipment_id?: string
          id?: string
          is_active?: boolean
          last_generated_date?: string | null
          location_id?: string
          recurrence_pattern?: string
          start_date?: string
          start_time?: string
          supervisor_user_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_maintenance_schedules_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_maintenance_schedules_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_maintenance_schedules_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_maintenance_schedules_supervisor_user_id_fkey"
            columns: ["supervisor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          can_edit: boolean | null
          can_manage: boolean | null
          can_view: boolean | null
          created_at: string
          id: string
          module: string
          role: string
          updated_at: string
        }
        Insert: {
          can_edit?: boolean | null
          can_manage?: boolean | null
          can_view?: boolean | null
          created_at?: string
          id?: string
          module: string
          role: string
          updated_at?: string
        }
        Update: {
          can_edit?: boolean | null
          can_manage?: boolean | null
          can_view?: boolean | null
          created_at?: string
          id?: string
          module?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      role_template_permissions: {
        Row: {
          action: string
          created_at: string
          granted: boolean
          id: string
          resource: string
          template_id: string
        }
        Insert: {
          action: string
          created_at?: string
          granted?: boolean
          id?: string
          resource: string
          template_id: string
        }
        Update: {
          action?: string
          created_at?: string
          granted?: boolean
          id?: string
          resource?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_template_permissions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "role_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      role_templates: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_system: boolean
          name: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_change_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          change_type: string
          company_id: string
          created_at: string
          id: string
          location_id: string
          note: string | null
          payload_after: Json
          payload_before: Json | null
          period_id: string
          reason_code: string | null
          requested_at: string
          requested_by: string
          status: string
          target_shift_id: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          change_type: string
          company_id: string
          created_at?: string
          id?: string
          location_id: string
          note?: string | null
          payload_after?: Json
          payload_before?: Json | null
          period_id: string
          reason_code?: string | null
          requested_at?: string
          requested_by: string
          status?: string
          target_shift_id?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          change_type?: string
          company_id?: string
          created_at?: string
          id?: string
          location_id?: string
          note?: string | null
          payload_after?: Json
          payload_before?: Json | null
          period_id?: string
          reason_code?: string | null
          requested_at?: string
          requested_by?: string
          status?: string
          target_shift_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_change_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_change_requests_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_change_requests_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "schedule_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_change_requests_target_shift_id_fkey"
            columns: ["target_shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_periods: {
        Row: {
          auto_lock_at: string | null
          company_id: string
          created_at: string
          created_by: string
          id: string
          location_id: string
          locked_at: string | null
          locked_by: string | null
          publish_deadline: string | null
          published_at: string | null
          published_by: string | null
          state: string
          updated_at: string
          week_start_date: string
        }
        Insert: {
          auto_lock_at?: string | null
          company_id: string
          created_at?: string
          created_by: string
          id?: string
          location_id: string
          locked_at?: string | null
          locked_by?: string | null
          publish_deadline?: string | null
          published_at?: string | null
          published_by?: string | null
          state?: string
          updated_at?: string
          week_start_date: string
        }
        Update: {
          auto_lock_at?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          id?: string
          location_id?: string
          locked_at?: string | null
          locked_by?: string | null
          publish_deadline?: string | null
          published_at?: string | null
          published_by?: string | null
          state?: string
          updated_at?: string
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_periods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_periods_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_audits: {
        Row: {
          assigned_to: string
          company_id: string
          created_at: string
          created_by: string
          frequency: string | null
          id: string
          location_id: string
          scheduled_for: string
          status: string
          template_id: string
        }
        Insert: {
          assigned_to: string
          company_id: string
          created_at?: string
          created_by: string
          frequency?: string | null
          id?: string
          location_id: string
          scheduled_for: string
          status?: string
          template_id: string
        }
        Update: {
          assigned_to?: string
          company_id?: string
          created_at?: string
          created_by?: string
          frequency?: string | null
          id?: string
          location_id?: string
          scheduled_for?: string
          status?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_audits_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_audits_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_audits_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "audit_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_assignments: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          assigned_at: string
          assigned_by: string
          confirmed_at: string | null
          id: string
          notes: string | null
          shift_id: string
          staff_id: string
          status: string
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          assigned_at?: string
          assigned_by: string
          confirmed_at?: string | null
          id?: string
          notes?: string | null
          shift_id: string
          staff_id: string
          status?: string
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          assigned_at?: string
          assigned_by?: string
          confirmed_at?: string | null
          id?: string
          notes?: string | null
          shift_id?: string
          staff_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_assignments_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_assignments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_presets: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          display_order: number | null
          end_time: string
          id: string
          is_active: boolean | null
          name: string
          start_time: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          end_time: string
          id?: string
          is_active?: boolean | null
          name: string
          start_time: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          end_time?: string
          id?: string
          is_active?: boolean | null
          name?: string
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_presets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_swap_requests: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          id: string
          manager_approved_at: string | null
          manager_approved_by: string | null
          manager_notes: string | null
          requester_assignment_id: string
          requester_notes: string | null
          requires_manager_approval: boolean | null
          responded_at: string | null
          status: string
          target_assignment_id: string | null
          target_responded_at: string | null
          target_response: string | null
          target_staff_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          id?: string
          manager_approved_at?: string | null
          manager_approved_by?: string | null
          manager_notes?: string | null
          requester_assignment_id: string
          requester_notes?: string | null
          requires_manager_approval?: boolean | null
          responded_at?: string | null
          status?: string
          target_assignment_id?: string | null
          target_responded_at?: string | null
          target_response?: string | null
          target_staff_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          id?: string
          manager_approved_at?: string | null
          manager_approved_by?: string | null
          manager_notes?: string | null
          requester_assignment_id?: string
          requester_notes?: string | null
          requires_manager_approval?: boolean | null
          responded_at?: string | null
          status?: string
          target_assignment_id?: string | null
          target_responded_at?: string | null
          target_response?: string | null
          target_staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_swap_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_swap_requests_manager_approved_by_fkey"
            columns: ["manager_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_swap_requests_requester_assignment_id_fkey"
            columns: ["requester_assignment_id"]
            isOneToOne: false
            referencedRelation: "shift_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_swap_requests_target_assignment_id_fkey"
            columns: ["target_assignment_id"]
            isOneToOne: false
            referencedRelation: "shift_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_swap_requests_target_staff_id_fkey"
            columns: ["target_staff_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          break_duration_minutes: number | null
          breaks: Json | null
          cancelled_at: string | null
          close_duty: boolean | null
          cohort_label: string | null
          company_id: string
          created_at: string
          created_by: string
          creator_name: string | null
          end_time: string
          id: string
          is_open_shift: boolean | null
          is_published: boolean | null
          location_id: string
          notes: string | null
          required_count: number
          role: string
          shift_date: string
          shift_type: string
          start_time: string
          status: string
          trainer_employee_id: string | null
          training_module_id: string | null
          training_session_id: string | null
          updated_at: string
        }
        Insert: {
          break_duration_minutes?: number | null
          breaks?: Json | null
          cancelled_at?: string | null
          close_duty?: boolean | null
          cohort_label?: string | null
          company_id: string
          created_at?: string
          created_by: string
          creator_name?: string | null
          end_time: string
          id?: string
          is_open_shift?: boolean | null
          is_published?: boolean | null
          location_id: string
          notes?: string | null
          required_count?: number
          role: string
          shift_date: string
          shift_type?: string
          start_time: string
          status?: string
          trainer_employee_id?: string | null
          training_module_id?: string | null
          training_session_id?: string | null
          updated_at?: string
        }
        Update: {
          break_duration_minutes?: number | null
          breaks?: Json | null
          cancelled_at?: string | null
          close_duty?: boolean | null
          cohort_label?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          creator_name?: string | null
          end_time?: string
          id?: string
          is_open_shift?: boolean | null
          is_published?: boolean | null
          location_id?: string
          notes?: string | null
          required_count?: number
          role?: string
          shift_date?: string
          shift_type?: string
          start_time?: string
          status?: string
          trainer_employee_id?: string | null
          training_module_id?: string | null
          training_session_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_trainer_employee_id_fkey"
            columns: ["trainer_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_training_module_id_fkey"
            columns: ["training_module_id"]
            isOneToOne: false
            referencedRelation: "training_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_training_session_id_fkey"
            columns: ["training_session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_events: {
        Row: {
          company_id: string
          created_at: string
          details_json: Json | null
          id: string
          location_id: string
          occurred_at: string
          sla_config_id: string
          status: string
        }
        Insert: {
          company_id: string
          created_at?: string
          details_json?: Json | null
          id?: string
          location_id: string
          occurred_at?: string
          sla_config_id: string
          status?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          details_json?: Json | null
          id?: string
          location_id?: string
          occurred_at?: string
          sla_config_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sla_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_events_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_events_sla_config_id_fkey"
            columns: ["sla_config_id"]
            isOneToOne: false
            referencedRelation: "location_sla_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_audits: {
        Row: {
          audit_date: string
          auditor_id: string
          company_id: string | null
          created_at: string
          custom_data: Json | null
          employee_id: string
          id: string
          location_id: string
          notes: string | null
          score: number
          template_id: string | null
          updated_at: string
        }
        Insert: {
          audit_date?: string
          auditor_id: string
          company_id?: string | null
          created_at?: string
          custom_data?: Json | null
          employee_id: string
          id?: string
          location_id: string
          notes?: string | null
          score: number
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          audit_date?: string
          auditor_id?: string
          company_id?: string | null
          created_at?: string
          custom_data?: Json | null
          employee_id?: string
          id?: string
          location_id?: string
          notes?: string | null
          score?: number
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_audits_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_audits_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_audits_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_audits_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "audit_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_events: {
        Row: {
          amount: number | null
          company_id: string
          created_at: string
          created_by: string
          description: string
          event_date: string
          event_type: string
          id: string
          location_id: string | null
          metadata: Json | null
          staff_id: string
        }
        Insert: {
          amount?: number | null
          company_id: string
          created_at?: string
          created_by: string
          description: string
          event_date?: string
          event_type: string
          id?: string
          location_id?: string | null
          metadata?: Json | null
          staff_id: string
        }
        Update: {
          amount?: number | null
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string
          event_date?: string
          event_type?: string
          id?: string
          location_id?: string | null
          metadata?: Json | null
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_events_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_events_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_locations: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean | null
          location_id: string
          staff_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean | null
          location_id: string
          staff_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean | null
          location_id?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_locations_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_performance_scores: {
        Row: {
          created_at: string
          evaluator_id: string
          id: string
          notes: string | null
          overall_score: number | null
          period_end: string
          period_start: string
          score_components: Json
          staff_id: string
        }
        Insert: {
          created_at?: string
          evaluator_id: string
          id?: string
          notes?: string | null
          overall_score?: number | null
          period_end: string
          period_start: string
          score_components: Json
          staff_id: string
        }
        Update: {
          created_at?: string
          evaluator_id?: string
          id?: string
          notes?: string | null
          overall_score?: number | null
          period_end?: string
          period_start?: string
          score_components?: Json
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_performance_scores_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          company_id: string
          created_at: string
          currency: string
          id: string
          next_charge_at: string | null
          plan_id: string
          price_amount: number
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          currency?: string
          id?: string
          next_charge_at?: string | null
          plan_id: string
          price_amount: number
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          currency?: string
          id?: string
          next_charge_at?: string | null
          plan_id?: string
          price_amount?: number
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          company_id: string
          contact_person: string | null
          created_at: string
          created_by: string
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_id: string
          contact_person?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_id?: string
          contact_person?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          comment: string
          created_at: string
          created_by: string
          id: string
          task_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          created_by: string
          id?: string
          task_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          created_by?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_completions: {
        Row: {
          completed_at: string
          completed_by_employee_id: string | null
          completed_late: boolean | null
          completion_mode: string
          completion_photo_url: string | null
          completion_reason: string | null
          created_at: string
          id: string
          occurrence_date: string
          overridden_by_user_id: string | null
          overridden_reason: string | null
          scheduled_time: string | null
          task_id: string
        }
        Insert: {
          completed_at?: string
          completed_by_employee_id?: string | null
          completed_late?: boolean | null
          completion_mode?: string
          completion_photo_url?: string | null
          completion_reason?: string | null
          created_at?: string
          id?: string
          occurrence_date: string
          overridden_by_user_id?: string | null
          overridden_reason?: string | null
          scheduled_time?: string | null
          task_id: string
        }
        Update: {
          completed_at?: string
          completed_by_employee_id?: string | null
          completed_late?: boolean | null
          completion_mode?: string
          completion_photo_url?: string | null
          completion_reason?: string | null
          created_at?: string
          id?: string
          occurrence_date?: string
          overridden_by_user_id?: string | null
          overridden_reason?: string | null
          scheduled_time?: string | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_completions_completed_by_employee_id_fkey"
            columns: ["completed_by_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_completions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_locations: {
        Row: {
          created_at: string
          id: string
          location_id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_id: string
          task_id: string
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_locations_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_photos: {
        Row: {
          caption: string | null
          created_at: string
          file_size: number | null
          id: string
          photo_url: string
          task_id: string
          uploaded_by: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          file_size?: number | null
          id?: string
          photo_url: string
          task_id: string
          uploaded_by: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          file_size?: number | null
          id?: string
          photo_url?: string
          task_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_photos_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_roles: {
        Row: {
          created_at: string
          id: string
          role_id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role_id: string
          task_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "employee_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_roles_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_templates: {
        Row: {
          assigned_role: string | null
          company_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean | null
          location_id: string | null
          priority: string
          recurrence_pattern: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_role?: string | null
          company_id: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          location_id?: string | null
          priority?: string
          recurrence_pattern?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_role?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          location_id?: string | null
          priority?: string
          recurrence_pattern?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_templates_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          allow_early_completion: boolean
          assigned_role_id: string | null
          assigned_to: string | null
          company_id: string
          completed_at: string | null
          completed_by: string | null
          completed_late: boolean | null
          completion_mode: string | null
          completion_photo_url: string | null
          completion_reason: string | null
          created_at: string
          created_by: string
          description: string | null
          due_at: string | null
          duration_minutes: number | null
          early_requires_photo: boolean
          early_requires_reason: boolean
          execution_mode: string
          id: string
          is_individual: boolean
          is_recurring_instance: boolean | null
          location_id: string | null
          lock_mode: string
          overridden_by: string | null
          overridden_reason: string | null
          parent_task_id: string | null
          priority: string
          recurrence_days_of_month: number[] | null
          recurrence_days_of_week: number[] | null
          recurrence_end_date: string | null
          recurrence_interval: number | null
          recurrence_times: string[] | null
          recurrence_type: string | null
          source: string
          source_reference_id: string | null
          start_at: string | null
          status: string
          title: string
          unlock_before_minutes: number
          updated_at: string
        }
        Insert: {
          allow_early_completion?: boolean
          assigned_role_id?: string | null
          assigned_to?: string | null
          company_id: string
          completed_at?: string | null
          completed_by?: string | null
          completed_late?: boolean | null
          completion_mode?: string | null
          completion_photo_url?: string | null
          completion_reason?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_at?: string | null
          duration_minutes?: number | null
          early_requires_photo?: boolean
          early_requires_reason?: boolean
          execution_mode?: string
          id?: string
          is_individual?: boolean
          is_recurring_instance?: boolean | null
          location_id?: string | null
          lock_mode?: string
          overridden_by?: string | null
          overridden_reason?: string | null
          parent_task_id?: string | null
          priority?: string
          recurrence_days_of_month?: number[] | null
          recurrence_days_of_week?: number[] | null
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_times?: string[] | null
          recurrence_type?: string | null
          source?: string
          source_reference_id?: string | null
          start_at?: string | null
          status?: string
          title: string
          unlock_before_minutes?: number
          updated_at?: string
        }
        Update: {
          allow_early_completion?: boolean
          assigned_role_id?: string | null
          assigned_to?: string | null
          company_id?: string
          completed_at?: string | null
          completed_by?: string | null
          completed_late?: boolean | null
          completion_mode?: string | null
          completion_photo_url?: string | null
          completion_reason?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_at?: string | null
          duration_minutes?: number | null
          early_requires_photo?: boolean
          early_requires_reason?: boolean
          execution_mode?: string
          id?: string
          is_individual?: boolean
          is_recurring_instance?: boolean | null
          location_id?: string | null
          lock_mode?: string
          overridden_by?: string | null
          overridden_reason?: string | null
          parent_task_id?: string | null
          priority?: string
          recurrence_days_of_month?: number[] | null
          recurrence_days_of_week?: number[] | null
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_times?: string[] | null
          recurrence_type?: string | null
          source?: string
          source_reference_id?: string | null
          start_at?: string | null
          status?: string
          title?: string
          unlock_before_minutes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_role_id_fkey"
            columns: ["assigned_role_id"]
            isOneToOne: false
            referencedRelation: "employee_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      template_locations: {
        Row: {
          created_at: string | null
          id: string
          location_id: string
          template_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          location_id: string
          template_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          location_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_locations_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "audit_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      test_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          completed: boolean
          employee_id: string
          id: string
          short_code: string | null
          test_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          completed?: boolean
          employee_id: string
          id?: string
          short_code?: string | null
          test_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          completed?: boolean
          employee_id?: string
          id?: string
          short_code?: string | null
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_assignments_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
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
          employee_id: string | null
          id: string
          passed: boolean | null
          score: number | null
          staff_location: string | null
          staff_name: string | null
          started_at: string
          test_id: string
          time_taken_minutes: number | null
        }
        Insert: {
          answers: Json
          completed_at?: string | null
          created_at?: string
          employee_id?: string | null
          id?: string
          passed?: boolean | null
          score?: number | null
          staff_location?: string | null
          staff_name?: string | null
          started_at?: string
          test_id: string
          time_taken_minutes?: number | null
        }
        Update: {
          answers?: Json
          completed_at?: string | null
          created_at?: string
          employee_id?: string | null
          id?: string
          passed?: boolean | null
          score?: number | null
          staff_location?: string | null
          staff_name?: string | null
          started_at?: string
          test_id?: string
          time_taken_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "test_submissions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
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
          company_id: string | null
          created_at: string
          created_by: string
          description: string | null
          document_id: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          is_template: boolean | null
          location_id: string | null
          passing_score: number
          scheduled_for: string | null
          time_limit_minutes: number
          title: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          document_id?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          is_template?: boolean | null
          location_id?: string | null
          passing_score?: number
          scheduled_for?: string | null
          time_limit_minutes?: number
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          document_id?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          is_template?: boolean | null
          location_id?: string | null
          passing_score?: number
          scheduled_for?: string | null
          time_limit_minutes?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tests_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tests_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "upcoming_renewals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tests_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      time_off_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          employee_id: string
          end_date: string
          id: string
          reason: string | null
          rejection_reason: string | null
          request_type: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          created_at?: string
          employee_id: string
          end_date: string
          id?: string
          reason?: string | null
          rejection_reason?: string | null
          request_type?: string | null
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string
          employee_id?: string
          end_date?: string
          id?: string
          reason?: string | null
          rejection_reason?: string | null
          request_type?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_off_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_off_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheets: {
        Row: {
          anomalies_json: Json | null
          company_id: string
          created_at: string
          date: string
          employee_id: string
          hours_worked: number | null
          id: string
          location_id: string
          overtime_hours: number | null
          shift_end: string | null
          shift_start: string | null
          status: string
          updated_at: string
        }
        Insert: {
          anomalies_json?: Json | null
          company_id: string
          created_at?: string
          date: string
          employee_id: string
          hours_worked?: number | null
          id?: string
          location_id: string
          overtime_hours?: number | null
          shift_end?: string | null
          shift_start?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          anomalies_json?: Json | null
          company_id?: string
          created_at?: string
          date?: string
          employee_id?: string
          hours_worked?: number | null
          id?: string
          location_id?: string
          overtime_hours?: number | null
          shift_end?: string | null
          shift_start?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      training_assignments: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          experience_level: string | null
          id: string
          location_id: string | null
          module_id: string
          notes: string | null
          start_date: string
          status: string
          trainee_employee_id: string
          trainer_employee_id: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          experience_level?: string | null
          id?: string
          location_id?: string | null
          module_id: string
          notes?: string | null
          start_date: string
          status?: string
          trainee_employee_id: string
          trainer_employee_id?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          experience_level?: string | null
          id?: string
          location_id?: string | null
          module_id?: string
          notes?: string | null
          start_date?: string
          status?: string
          trainee_employee_id?: string
          trainer_employee_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_assignments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_assignments_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "training_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_assignments_trainee_employee_id_fkey"
            columns: ["trainee_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_assignments_trainer_employee_id_fkey"
            columns: ["trainer_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      training_evaluations: {
        Row: {
          assignment_id: string
          audit_instance_id: string | null
          company_id: string
          created_at: string
          evaluation_date: string
          id: string
          module_day_id: string | null
          notes: string | null
          passed: boolean | null
          score: number | null
          session_id: string | null
          trainee_employee_id: string
          trainer_employee_id: string
          updated_at: string
        }
        Insert: {
          assignment_id: string
          audit_instance_id?: string | null
          company_id: string
          created_at?: string
          evaluation_date: string
          id?: string
          module_day_id?: string | null
          notes?: string | null
          passed?: boolean | null
          score?: number | null
          session_id?: string | null
          trainee_employee_id: string
          trainer_employee_id: string
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          audit_instance_id?: string | null
          company_id?: string
          created_at?: string
          evaluation_date?: string
          id?: string
          module_day_id?: string | null
          notes?: string | null
          passed?: boolean | null
          score?: number | null
          session_id?: string | null
          trainee_employee_id?: string
          trainer_employee_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_evaluations_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "training_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_evaluations_audit_instance_id_fkey"
            columns: ["audit_instance_id"]
            isOneToOne: false
            referencedRelation: "location_audits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_evaluations_audit_instance_id_fkey"
            columns: ["audit_instance_id"]
            isOneToOne: false
            referencedRelation: "mv_audit_section_scores"
            referencedColumns: ["audit_id"]
          },
          {
            foreignKeyName: "training_evaluations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_evaluations_module_day_id_fkey"
            columns: ["module_day_id"]
            isOneToOne: false
            referencedRelation: "training_module_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_evaluations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_evaluations_trainee_employee_id_fkey"
            columns: ["trainee_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_evaluations_trainer_employee_id_fkey"
            columns: ["trainer_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      training_generated_tasks: {
        Row: {
          assignment_id: string
          created_at: string
          id: string
          module_day_id: string
          scheduled_date: string
          task_id: string | null
          template_task_id: string
        }
        Insert: {
          assignment_id: string
          created_at?: string
          id?: string
          module_day_id: string
          scheduled_date: string
          task_id?: string | null
          template_task_id: string
        }
        Update: {
          assignment_id?: string
          created_at?: string
          id?: string
          module_day_id?: string
          scheduled_date?: string
          task_id?: string | null
          template_task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_generated_tasks_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "training_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_generated_tasks_module_day_id_fkey"
            columns: ["module_day_id"]
            isOneToOne: false
            referencedRelation: "training_module_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_generated_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_generated_tasks_template_task_id_fkey"
            columns: ["template_task_id"]
            isOneToOne: false
            referencedRelation: "training_module_day_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      training_module_day_tasks: {
        Row: {
          created_at: string
          id: string
          module_day_id: string
          requires_proof: boolean
          sort_order: number
          task_description: string | null
          task_title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          module_day_id: string
          requires_proof?: boolean
          sort_order?: number
          task_description?: string | null
          task_title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          module_day_id?: string
          requires_proof?: boolean
          sort_order?: number
          task_description?: string | null
          task_title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_module_day_tasks_module_day_id_fkey"
            columns: ["module_day_id"]
            isOneToOne: false
            referencedRelation: "training_module_days"
            referencedColumns: ["id"]
          },
        ]
      }
      training_module_days: {
        Row: {
          created_at: string
          day_number: number
          id: string
          module_id: string
          notes: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_number: number
          id?: string
          module_id: string
          notes?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_number?: number
          id?: string
          module_id?: string
          notes?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_module_days_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "training_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      training_module_evaluations: {
        Row: {
          audit_template_id: string
          created_at: string
          id: string
          is_required: boolean
          module_day_id: string | null
          module_id: string
        }
        Insert: {
          audit_template_id: string
          created_at?: string
          id?: string
          is_required?: boolean
          module_day_id?: string | null
          module_id: string
        }
        Update: {
          audit_template_id?: string
          created_at?: string
          id?: string
          is_required?: boolean
          module_day_id?: string | null
          module_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_module_evaluations_audit_template_id_fkey"
            columns: ["audit_template_id"]
            isOneToOne: false
            referencedRelation: "audit_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_module_evaluations_module_day_id_fkey"
            columns: ["module_day_id"]
            isOneToOne: false
            referencedRelation: "training_module_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_module_evaluations_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "training_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      training_programs: {
        Row: {
          category: string | null
          company_id: string
          created_at: string
          created_by: string
          description: string | null
          difficulty_level: number | null
          duration_days: number | null
          id: string
          is_active: boolean | null
          name: string
          required_for_roles: string[] | null
          target_role_id: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          company_id: string
          created_at?: string
          created_by: string
          description?: string | null
          difficulty_level?: number | null
          duration_days?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          required_for_roles?: string[] | null
          target_role_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          difficulty_level?: number | null
          duration_days?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          required_for_roles?: string[] | null
          target_role_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_programs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_programs_target_role_id_fkey"
            columns: ["target_role_id"]
            isOneToOne: false
            referencedRelation: "employee_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      training_progress: {
        Row: {
          completed_at: string | null
          completion_percentage: number | null
          id: string
          last_activity_at: string | null
          program_id: string
          staff_id: string
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          completion_percentage?: number | null
          id?: string
          last_activity_at?: string | null
          program_id: string
          staff_id: string
          started_at?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          completion_percentage?: number | null
          id?: string
          last_activity_at?: string | null
          program_id?: string
          staff_id?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_progress_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "training_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_progress_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      training_session_attendees: {
        Row: {
          attendee_role: string
          created_at: string
          employee_id: string
          id: string
          session_id: string
        }
        Insert: {
          attendee_role?: string
          created_at?: string
          employee_id: string
          id?: string
          session_id: string
        }
        Update: {
          attendee_role?: string
          created_at?: string
          employee_id?: string
          id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_session_attendees_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_session_attendees_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      training_sessions: {
        Row: {
          assignment_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          end_time: string
          id: string
          location_id: string
          module_id: string | null
          notes: string | null
          session_date: string
          start_time: string
          title: string | null
          trainer_employee_id: string | null
          updated_at: string
        }
        Insert: {
          assignment_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          end_time: string
          id?: string
          location_id: string
          module_id?: string | null
          notes?: string | null
          session_date: string
          start_time: string
          title?: string | null
          trainer_employee_id?: string | null
          updated_at?: string
        }
        Update: {
          assignment_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          end_time?: string
          id?: string
          location_id?: string
          module_id?: string | null
          notes?: string | null
          session_date?: string
          start_time?: string
          title?: string | null
          trainer_employee_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_sessions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "training_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "training_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_trainer_employee_id_fkey"
            columns: ["trainer_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      training_step_completions: {
        Row: {
          completed_at: string
          id: string
          notes: string | null
          progress_id: string
          step_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          notes?: string | null
          progress_id: string
          step_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          notes?: string | null
          progress_id?: string
          step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_step_completions_progress_id_fkey"
            columns: ["progress_id"]
            isOneToOne: false
            referencedRelation: "training_progress"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_step_completions_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "training_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      training_steps: {
        Row: {
          created_at: string
          description: string | null
          estimated_minutes: number | null
          id: string
          is_required: boolean | null
          program_id: string
          reference_id: string | null
          step_order: number
          step_type: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          estimated_minutes?: number | null
          id?: string
          is_required?: boolean | null
          program_id: string
          reference_id?: string | null
          step_order: number
          step_type: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          estimated_minutes?: number | null
          id?: string
          is_required?: boolean | null
          program_id?: string
          reference_id?: string | null
          step_order?: number
          step_type?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_steps_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "training_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_module_onboarding: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          module_name: string
          steps_completed: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          module_name: string
          steps_completed?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          module_name?: string
          steps_completed?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_role_template_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          company_id: string
          id: string
          template_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          company_id: string
          id?: string
          template_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          company_id?: string
          id?: string
          template_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_role_template_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_role_template_assignments_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "role_templates"
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
      vouchers: {
        Row: {
          brand_logo_url: string | null
          code: string
          company_id: string
          created_at: string
          currency: string
          customer_name: string
          expires_at: string
          id: string
          linked_submission_id: string | null
          location_ids: string[] | null
          redeemed_at: string | null
          redeemed_location_id: string | null
          status: string
          terms_text: string | null
          updated_at: string
          value: number
        }
        Insert: {
          brand_logo_url?: string | null
          code?: string
          company_id: string
          created_at?: string
          currency?: string
          customer_name: string
          expires_at: string
          id?: string
          linked_submission_id?: string | null
          location_ids?: string[] | null
          redeemed_at?: string | null
          redeemed_location_id?: string | null
          status?: string
          terms_text?: string | null
          updated_at?: string
          value: number
        }
        Update: {
          brand_logo_url?: string | null
          code?: string
          company_id?: string
          created_at?: string
          currency?: string
          customer_name?: string
          expires_at?: string
          id?: string
          linked_submission_id?: string | null
          location_ids?: string[] | null
          redeemed_at?: string | null
          redeemed_location_id?: string | null
          status?: string
          terms_text?: string | null
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "vouchers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_linked_submission_id_fkey"
            columns: ["linked_submission_id"]
            isOneToOne: false
            referencedRelation: "mystery_shopper_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_redeemed_location_id_fkey"
            columns: ["redeemed_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      waste_daily_rollups: {
        Row: {
          company_id: string
          day: string
          entry_count: number
          location_id: string
          total_cost: number
          total_weight_kg: number
        }
        Insert: {
          company_id: string
          day: string
          entry_count?: number
          location_id: string
          total_cost?: number
          total_weight_kg?: number
        }
        Update: {
          company_id?: string
          day?: string
          entry_count?: number
          location_id?: string
          total_cost?: number
          total_weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "waste_daily_rollups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waste_daily_rollups_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      waste_entries: {
        Row: {
          company_id: string
          cost_total: number
          created_at: string
          created_by: string
          id: string
          location_id: string
          notes: string | null
          occurred_at: string
          photo_path: string | null
          status: string
          unit_cost_used: number
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
          waste_product_id: string
          waste_reason_id: string | null
          weight_kg: number
        }
        Insert: {
          company_id: string
          cost_total?: number
          created_at?: string
          created_by: string
          id?: string
          location_id: string
          notes?: string | null
          occurred_at?: string
          photo_path?: string | null
          status?: string
          unit_cost_used?: number
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          waste_product_id: string
          waste_reason_id?: string | null
          weight_kg: number
        }
        Update: {
          company_id?: string
          cost_total?: number
          created_at?: string
          created_by?: string
          id?: string
          location_id?: string
          notes?: string | null
          occurred_at?: string
          photo_path?: string | null
          status?: string
          unit_cost_used?: number
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          waste_product_id?: string
          waste_reason_id?: string | null
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "waste_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waste_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waste_entries_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waste_entries_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waste_entries_waste_product_id_fkey"
            columns: ["waste_product_id"]
            isOneToOne: false
            referencedRelation: "waste_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waste_entries_waste_reason_id_fkey"
            columns: ["waste_reason_id"]
            isOneToOne: false
            referencedRelation: "waste_reasons"
            referencedColumns: ["id"]
          },
        ]
      }
      waste_products: {
        Row: {
          active: boolean
          category: string | null
          company_id: string
          cost_model: string
          created_at: string
          id: string
          name: string
          photo_hint_url: string | null
          unit_cost: number
          uom: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string | null
          company_id: string
          cost_model?: string
          created_at?: string
          id?: string
          name: string
          photo_hint_url?: string | null
          unit_cost?: number
          uom?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string | null
          company_id?: string
          cost_model?: string
          created_at?: string
          id?: string
          name?: string
          photo_hint_url?: string | null
          unit_cost?: number
          uom?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "waste_products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      waste_reasons: {
        Row: {
          active: boolean
          company_id: string
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          company_id: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "waste_reasons_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      waste_thresholds: {
        Row: {
          active: boolean
          category: string | null
          company_id: string
          created_at: string
          id: string
          location_id: string | null
          threshold_type: string
          threshold_value: number
          waste_product_id: string | null
        }
        Insert: {
          active?: boolean
          category?: string | null
          company_id: string
          created_at?: string
          id?: string
          location_id?: string | null
          threshold_type?: string
          threshold_value?: number
          waste_product_id?: string | null
        }
        Update: {
          active?: boolean
          category?: string | null
          company_id?: string
          created_at?: string
          id?: string
          location_id?: string | null
          threshold_type?: string
          threshold_value?: number
          waste_product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waste_thresholds_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waste_thresholds_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waste_thresholds_waste_product_id_fkey"
            columns: ["waste_product_id"]
            isOneToOne: false
            referencedRelation: "waste_products"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_logs: {
        Row: {
          company_id: string
          created_at: string | null
          error_message: string | null
          headers: Json | null
          id: string
          integration_id: string | null
          payload: Json
          processed: boolean | null
          processed_at: string | null
          status_code: number | null
          webhook_type: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          error_message?: string | null
          headers?: Json | null
          id?: string
          integration_id?: string | null
          payload: Json
          processed?: boolean | null
          processed_at?: string | null
          status_code?: number | null
          webhook_type: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          error_message?: string | null
          headers?: Json | null
          id?: string
          integration_id?: string | null
          payload?: Json
          processed?: boolean | null
          processed_at?: string | null
          status_code?: number | null
          webhook_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_logs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      workforce_exceptions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          attendance_id: string | null
          company_id: string
          created_at: string
          detected_at: string
          employee_id: string
          exception_type: string
          id: string
          location_id: string
          metadata: Json
          note: string | null
          reason_code: string | null
          requested_by: string | null
          resolved_at: string | null
          shift_date: string
          shift_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          attendance_id?: string | null
          company_id: string
          created_at?: string
          detected_at?: string
          employee_id: string
          exception_type: string
          id?: string
          location_id: string
          metadata?: Json
          note?: string | null
          reason_code?: string | null
          requested_by?: string | null
          resolved_at?: string | null
          shift_date: string
          shift_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          attendance_id?: string | null
          company_id?: string
          created_at?: string
          detected_at?: string
          employee_id?: string
          exception_type?: string
          id?: string
          location_id?: string
          metadata?: Json
          note?: string | null
          reason_code?: string | null
          requested_by?: string | null
          resolved_at?: string | null
          shift_date?: string
          shift_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workforce_exceptions_attendance_id_fkey"
            columns: ["attendance_id"]
            isOneToOne: false
            referencedRelation: "attendance_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workforce_exceptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workforce_exceptions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workforce_exceptions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workforce_exceptions_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      workforce_policies: {
        Row: {
          block_publish_on_critical: boolean
          company_id: string
          created_at: string
          early_leave_threshold_minutes: number
          grace_minutes: number
          id: string
          late_threshold_minutes: number
          location_id: string | null
          require_reason_on_locked_edits: boolean
          unscheduled_clock_in_policy: string
          updated_at: string
        }
        Insert: {
          block_publish_on_critical?: boolean
          company_id: string
          created_at?: string
          early_leave_threshold_minutes?: number
          grace_minutes?: number
          id?: string
          late_threshold_minutes?: number
          location_id?: string | null
          require_reason_on_locked_edits?: boolean
          unscheduled_clock_in_policy?: string
          updated_at?: string
        }
        Update: {
          block_publish_on_critical?: boolean
          company_id?: string
          created_at?: string
          early_leave_threshold_minutes?: number
          grace_minutes?: number
          id?: string
          late_threshold_minutes?: number
          location_id?: string | null
          require_reason_on_locked_edits?: boolean
          unscheduled_clock_in_policy?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workforce_policies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workforce_policies_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      mv_attendance_daily_stats: {
        Row: {
          auto_clockout_count: number | null
          company_id: string | null
          late_count: number | null
          location_id: string | null
          location_name: string | null
          shift_date: string | null
          staff_checked_in: number | null
          staff_scheduled: number | null
          total_late_minutes: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shifts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      mv_audit_section_scores: {
        Row: {
          audit_date: string | null
          audit_id: string | null
          company_id: string | null
          field_count: number | null
          location_id: string | null
          section_id: string | null
          section_name: string | null
          section_score: number | null
          template_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_field_responses_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "audit_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_audits_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_audits_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_audits_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "audit_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      mv_audit_stats_by_location: {
        Row: {
          avg_score: number | null
          company_id: string | null
          completed_audits: number | null
          latest_audit_date: string | null
          location_id: string | null
          location_name: string | null
          max_score: number | null
          min_score: number | null
          overdue_audits: number | null
          scored_audit_count: number | null
          total_audits: number | null
        }
        Relationships: [
          {
            foreignKeyName: "location_audits_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_audits_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      mv_task_completion_stats: {
        Row: {
          company_id: string | null
          late_completions: number | null
          location_id: string | null
          location_name: string | null
          occurrence_date: string | null
          on_time_completions: number | null
          tasks_with_completions: number | null
          total_completions: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
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
      upcoming_renewals: {
        Row: {
          category_name: string | null
          company_id: string | null
          document_type: string | null
          file_url: string | null
          id: string | null
          location_id: string | null
          location_name: string | null
          renewal_date: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      apply_schedule_change_request: {
        Args: { p_request_id: string }
        Returns: Json
      }
      approve_shift_assignment: {
        Args: { assignment_id: string }
        Returns: Json
      }
      calculate_location_audit_score: {
        Args: { audit_id: string }
        Returns: number
      }
      company_has_module: {
        Args: { _company_id: string; _module: string }
        Returns: boolean
      }
      complete_task_guarded: {
        Args: {
          p_completed_at?: string
          p_completion_photo_url?: string
          p_completion_reason?: string
          p_is_manager_override?: boolean
          p_occurrence_date: string
          p_override_reason?: string
          p_task_id: string
        }
        Returns: Json
      }
      create_company_onboarding: {
        Args: {
          p_industry_id: string
          p_modules: string[]
          p_name: string
          p_slug: string
          p_subscription_tier: string
        }
        Returns: string
      }
      create_employee_user: {
        Args: {
          employee_email: string
          employee_id: string
          employee_name: string
        }
        Returns: string
      }
      create_workforce_exception: {
        Args: {
          p_attendance_id?: string
          p_company_id: string
          p_employee_id: string
          p_exception_type: string
          p_location_id: string
          p_metadata?: Json
          p_note?: string
          p_reason_code?: string
          p_shift_date?: string
          p_shift_id?: string
        }
        Returns: string
      }
      employee_has_time_off: {
        Args: { _check_date: string; _employee_id: string }
        Returns: boolean
      }
      find_or_create_audit_draft: {
        Args: {
          p_audit_date: string
          p_company_id: string
          p_location_id: string
          p_scheduled_audit_id?: string
          p_template_id: string
          p_user_id: string
        }
        Returns: string
      }
      find_scheduled_shift_for_clockin:
        | {
            Args: {
              p_check_time: string
              p_company_id: string
              p_employee_id: string
              p_grace_minutes?: number
              p_location_id: string
            }
            Returns: {
              end_time: string
              is_late: boolean
              late_minutes: number
              shift_date: string
              shift_id: string
              start_time: string
            }[]
          }
        | {
            Args: {
              p_check_time: string
              p_employee_id: string
              p_grace_minutes?: number
              p_location_id: string
            }
            Returns: {
              end_time: string
              is_late: boolean
              late_minutes: number
              shift_date: string
              shift_id: string
              start_time: string
            }[]
          }
      generate_audit_draft_key: {
        Args: {
          p_company_id: string
          p_location_id: string
          p_scheduled_audit_id?: string
          p_template_id: string
          p_user_id: string
        }
        Returns: string
      }
      generate_kiosk_slug: {
        Args: { location_id: string; location_name: string }
        Returns: string
      }
      generate_short_code: { Args: never; Returns: string }
      get_company_timezone: { Args: { p_company_id: string }; Returns: string }
      get_employee_company_id: { Args: { _user_id: string }; Returns: string }
      get_kiosk_attendance_logs: {
        Args: {
          p_end: string
          p_location_id: string
          p_start: string
          p_token: string
        }
        Returns: {
          check_in_at: string
          check_out_at: string
          id: string
          staff_id: string
        }[]
      }
      get_kiosk_task_completions: {
        Args: {
          p_company_id: string
          p_location_id: string
          p_occurrence_date: string
          p_task_ids: string[]
          p_token: string
        }
        Returns: {
          completed_at: string
          completed_by_employee_id: string
          completion_mode: string
          occurrence_date: string
          task_id: string
        }[]
      }
      get_kiosk_tasks: {
        Args: { p_company_id: string; p_location_id: string; p_token: string }
        Returns: {
          allow_early_completion: boolean
          assigned_role: Json
          assigned_role_id: string
          assigned_to: string
          company_id: string
          completed_at: string
          completed_by: string
          completed_late: boolean
          completion_mode: string
          completion_photo_url: string
          completion_reason: string
          created_at: string
          created_by: string
          description: string
          due_at: string
          duration_minutes: number
          early_requires_photo: boolean
          early_requires_reason: boolean
          execution_mode: string
          id: string
          is_individual: boolean
          is_recurring_instance: boolean
          location: Json
          location_id: string
          lock_mode: string
          overridden_by: string
          overridden_reason: string
          parent_task_id: string
          priority: string
          recurrence_days_of_month: number[]
          recurrence_days_of_week: number[]
          recurrence_end_date: string
          recurrence_interval: number
          recurrence_type: string
          role_ids: string[]
          role_names: string[]
          source: string
          source_reference_id: string
          start_at: string
          status: string
          title: string
          unlock_before_minutes: number
          updated_at: string
        }[]
      }
      get_mv_attendance_stats: {
        Args: {
          p_company_id: string
          p_end_date?: string
          p_start_date?: string
        }
        Returns: {
          auto_clockout_count: number | null
          company_id: string | null
          late_count: number | null
          location_id: string | null
          location_name: string | null
          shift_date: string | null
          staff_checked_in: number | null
          staff_scheduled: number | null
          total_late_minutes: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "mv_attendance_daily_stats"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_mv_audit_stats: {
        Args: { p_company_id: string }
        Returns: {
          avg_score: number | null
          company_id: string | null
          completed_audits: number | null
          latest_audit_date: string | null
          location_id: string | null
          location_name: string | null
          max_score: number | null
          min_score: number | null
          overdue_audits: number | null
          scored_audit_count: number | null
          total_audits: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "mv_audit_stats_by_location"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_mv_section_scores: {
        Args: { p_company_id: string }
        Returns: {
          audit_date: string | null
          audit_id: string | null
          company_id: string | null
          field_count: number | null
          location_id: string | null
          section_id: string | null
          section_name: string | null
          section_score: number | null
          template_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "mv_audit_section_scores"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_mv_task_stats: {
        Args: {
          p_company_id: string
          p_end_date?: string
          p_start_date?: string
        }
        Returns: {
          company_id: string | null
          late_completions: number | null
          location_id: string | null
          location_name: string | null
          occurrence_date: string | null
          on_time_completions: number | null
          tasks_with_completions: number | null
          total_completions: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "mv_task_completion_stats"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_mystery_shopper_template_by_token: {
        Args: { p_token: string }
        Returns: {
          company_id: string
          description: string
          id: string
          name: string
        }[]
      }
      get_next_revision_number: {
        Args: { p_audit_id: string }
        Returns: number
      }
      get_next_schedule_date: {
        Args: {
          p_day_of_month: number
          p_day_of_week: number
          p_last_date: string
          p_pattern: string
        }
        Returns: string
      }
      get_or_create_schedule_period: {
        Args: {
          p_company_id: string
          p_location_id: string
          p_week_start_date: string
        }
        Returns: {
          auto_lock_at: string | null
          company_id: string
          created_at: string
          created_by: string
          id: string
          location_id: string
          locked_at: string | null
          locked_by: string | null
          publish_deadline: string | null
          published_at: string | null
          published_by: string | null
          state: string
          updated_at: string
          week_start_date: string
        }
        SetofOptions: {
          from: "*"
          to: "schedule_periods"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_user_company_id: { Args: { _user_id: string }; Returns: string }
      get_waste_report: {
        Args: {
          p_category?: string
          p_company_id: string
          p_from?: string
          p_location_ids?: string[]
          p_product_id?: string
          p_reason_id?: string
          p_to?: string
          p_user_id?: string
        }
        Returns: Json
      }
      get_workforce_policy: {
        Args: { p_company_id: string; p_location_id: string }
        Returns: {
          block_publish_on_critical: boolean
          company_id: string
          created_at: string
          early_leave_threshold_minutes: number
          grace_minutes: number
          id: string
          late_threshold_minutes: number
          location_id: string | null
          require_reason_on_locked_edits: boolean
          unscheduled_clock_in_policy: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "workforce_policies"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_company_permission: {
        Args: {
          _permission: Database["public"]["Enums"]["company_permission"]
          _user_id: string
        }
        Returns: boolean
      }
      has_company_role: {
        Args: { _role: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_employee_assigned_to_shift: {
        Args: { _shift_id: string; _user_id: string }
        Returns: boolean
      }
      is_subscription_active: { Args: { company_id: string }; Returns: boolean }
      is_task_occurrence_completed: {
        Args: {
          p_employee_id?: string
          p_occurrence_date: string
          p_task_id: string
        }
        Returns: boolean
      }
      is_trial_valid: { Args: { company_id: string }; Returns: boolean }
      kiosk_can_view_task: { Args: { _task_id: string }; Returns: boolean }
      kiosk_can_view_task_location: {
        Args: { _location_id: string }
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
      recompute_audit_section_scores: {
        Args: { p_audit_id: string }
        Returns: undefined
      }
      refresh_dashboard_materialized_views: { Args: never; Returns: undefined }
      reject_shift_assignment: {
        Args: { assignment_id: string }
        Returns: Json
      }
      tz_date_range_to_utc: {
        Args: { from_date: string; to_date: string; tz?: string }
        Returns: {
          from_utc: string
          to_utc: string
        }[]
      }
      tz_timestamp_to_local_date: {
        Args: { ts: string; tz?: string }
        Returns: string
      }
      update_overdue_interventions: { Args: never; Returns: undefined }
      user_has_location_access: {
        Args: { _location_id: string; _user_id: string }
        Returns: boolean
      }
      user_in_company: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      user_is_manager_in_company: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "checker" | "manager" | "hr"
      billing_status: "active" | "past_due" | "paused"
      company_permission:
        | "manage_users"
        | "manage_settings"
        | "manage_billing"
        | "manage_modules"
        | "view_reports"
        | "manage_locations"
        | "manage_employees"
        | "manage_shifts"
        | "manage_audits"
        | "manage_notifications"
      invoice_status: "open" | "paid" | "failed"
      subscription_status: "active" | "past_due" | "paused" | "canceled"
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
      app_role: ["admin", "checker", "manager", "hr"],
      billing_status: ["active", "past_due", "paused"],
      company_permission: [
        "manage_users",
        "manage_settings",
        "manage_billing",
        "manage_modules",
        "view_reports",
        "manage_locations",
        "manage_employees",
        "manage_shifts",
        "manage_audits",
        "manage_notifications",
      ],
      invoice_status: ["open", "paid", "failed"],
      subscription_status: ["active", "past_due", "paused", "canceled"],
    },
  },
} as const
