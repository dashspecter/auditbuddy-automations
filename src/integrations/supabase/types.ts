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
      companies: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          auto_clockout_delay_minutes: number | null
          created_at: string
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
          created_at?: string
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
          created_at?: string
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
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
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
          close_duty: boolean | null
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
          start_time: string
          status: string
          updated_at: string
        }
        Insert: {
          break_duration_minutes?: number | null
          breaks?: Json | null
          close_duty?: boolean | null
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
          start_time: string
          status?: string
          updated_at?: string
        }
        Update: {
          break_duration_minutes?: number | null
          breaks?: Json | null
          close_duty?: boolean | null
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
          start_time?: string
          status?: string
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
          created_at: string
          created_by: string
          description: string
          event_date: string
          event_type: string
          id: string
          metadata: Json | null
          staff_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          created_by: string
          description: string
          event_date?: string
          event_type: string
          id?: string
          metadata?: Json | null
          staff_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          created_by?: string
          description?: string
          event_date?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          staff_id?: string
        }
        Relationships: [
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
          assigned_role_id: string | null
          assigned_to: string | null
          company_id: string
          completed_at: string | null
          completed_by: string | null
          completed_late: boolean | null
          created_at: string
          created_by: string
          description: string | null
          due_at: string | null
          duration_minutes: number | null
          id: string
          is_individual: boolean
          is_recurring_instance: boolean | null
          location_id: string | null
          parent_task_id: string | null
          priority: string
          recurrence_end_date: string | null
          recurrence_interval: number | null
          recurrence_type: string | null
          source: string
          source_reference_id: string | null
          start_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_role_id?: string | null
          assigned_to?: string | null
          company_id: string
          completed_at?: string | null
          completed_by?: string | null
          completed_late?: boolean | null
          created_at?: string
          created_by: string
          description?: string | null
          due_at?: string | null
          duration_minutes?: number | null
          id?: string
          is_individual?: boolean
          is_recurring_instance?: boolean | null
          location_id?: string | null
          parent_task_id?: string | null
          priority?: string
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_type?: string | null
          source?: string
          source_reference_id?: string | null
          start_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_role_id?: string | null
          assigned_to?: string | null
          company_id?: string
          completed_at?: string | null
          completed_by?: string | null
          completed_late?: boolean | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_at?: string | null
          duration_minutes?: number | null
          id?: string
          is_individual?: boolean
          is_recurring_instance?: boolean | null
          location_id?: string | null
          parent_task_id?: string | null
          priority?: string
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_type?: string | null
          source?: string
          source_reference_id?: string | null
          start_at?: string | null
          status?: string
          title?: string
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
      training_programs: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          required_for_roles: string[] | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          required_for_roles?: string[] | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          required_for_roles?: string[] | null
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
      create_employee_user: {
        Args: {
          employee_email: string
          employee_id: string
          employee_name: string
        }
        Returns: string
      }
      employee_has_time_off: {
        Args: { _check_date: string; _employee_id: string }
        Returns: boolean
      }
      generate_kiosk_slug: {
        Args: { location_id: string; location_name: string }
        Returns: string
      }
      generate_short_code: { Args: never; Returns: string }
      get_employee_company_id: { Args: { _user_id: string }; Returns: string }
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
      get_user_company_id: { Args: { _user_id: string }; Returns: string }
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
      reject_shift_assignment: {
        Args: { assignment_id: string }
        Returns: Json
      }
      update_overdue_interventions: { Args: never; Returns: undefined }
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
