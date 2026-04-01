/**
 * Tool definitions for Dash.
 * Extracted from index.ts for maintainability.
 * Each entry is a Gemini-compatible function declaration.
 */

export const tools = [
  // --- READ: Cross-module ---
  {
    type: "function",
    function: {
      name: "get_location_overview",
      description: "Get a high-level overview of a location: employee count, recent audit score, open CAs, pending tasks. Requires location name or ID.",
      parameters: {
        type: "object",
        properties: {
          location_name: { type: "string", description: "Location name (partial match)" },
          location_id: { type: "string", description: "Location UUID (if known)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_cross_module_summary",
      description: "Get a cross-module operational summary for a location or all locations over a date range. Covers: audits, tasks, attendance, CAs, work orders.",
      parameters: {
        type: "object",
        properties: {
          location_id: { type: "string", description: "Optional location UUID filter" },
          from: { type: "string", description: "Start date YYYY-MM-DD" },
          to: { type: "string", description: "End date YYYY-MM-DD" },
        },
        required: ["from", "to"],
      },
    },
  },
  // --- READ: Employees ---
  {
    type: "function",
    function: {
      name: "search_employees",
      description: "Search employees by name, phone, or email.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search text" },
          limit: { type: "number", description: "Max results (default 10)" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_employee_shifts",
      description: "Get the list of shifts assigned to a specific employee. ALWAYS use this when asked to 'show shifts for X', 'list shifts for X', 'show me X's schedule', 'what shifts does X have?', 'what is X working this week/month?', 'are there other shifts for X'. Never refuse to show shifts — always call this tool.",
      parameters: {
        type: "object",
        properties: {
          employee_name: { type: "string", description: "Employee name (partial match)" },
          from_date: { type: "string", description: "Start date filter YYYY-MM-DD (optional)" },
          to_date: { type: "string", description: "End date filter YYYY-MM-DD (optional)" },
          limit: { type: "number", description: "Max shifts to return (default 20, max 50)" },
        },
        required: ["employee_name"],
      },
    },
  },
  // --- READ: Audits ---
  {
    type: "function",
    function: {
      name: "get_audit_results",
      description: "Get recent audit results (scores, templates used, locations) within a date range. Accepts location_name for automatic resolution.",
      parameters: {
        type: "object",
        properties: {
          location_id: { type: "string", description: "Optional location UUID filter" },
          location_name: { type: "string", description: "Optional location name (partial match, auto-resolved to ID)" },
          template_id: { type: "string", description: "Optional template filter" },
          from: { type: "string", description: "Start date YYYY-MM-DD" },
          to: { type: "string", description: "End date YYYY-MM-DD" },
          limit: { type: "number", description: "Max results (default 20)" },
        },
        required: ["from", "to"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compare_location_performance",
      description: "Compare audit performance across locations for a date range. Accepts location_names for automatic resolution. If both omitted, compares ALL active locations.",
      parameters: {
        type: "object",
        properties: {
          location_ids: { type: "array", items: { type: "string" }, description: "Location UUIDs to compare." },
          location_names: { type: "array", items: { type: "string" }, description: "Location names (partial match, auto-resolved to IDs)" },
          from: { type: "string", description: "Start date YYYY-MM-DD" },
          to: { type: "string", description: "End date YYYY-MM-DD" },
        },
        required: ["from", "to"],
      },
    },
  },
  // --- READ: Corrective Actions ---
  {
    type: "function",
    function: {
      name: "get_open_corrective_actions",
      description: "List open/in-progress corrective actions, optionally filtered by location or severity.",
      parameters: {
        type: "object",
        properties: {
          location_id: { type: "string" },
          severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
          limit: { type: "number", description: "Max results (default 50)" },
        },
      },
    },
  },
  // --- READ: Tasks ---
  {
    type: "function",
    function: {
      name: "get_task_completion_summary",
      description: "Get task completion rates for a date range, optionally by location.",
      parameters: {
        type: "object",
        properties: {
          location_id: { type: "string" },
          from: { type: "string", description: "Start date YYYY-MM-DD" },
          to: { type: "string", description: "End date YYYY-MM-DD" },
        },
        required: ["from", "to"],
      },
    },
  },
  // --- READ: Attendance ---
  {
    type: "function",
    function: {
      name: "get_attendance_summary",
      description: "Get all attendance check-ins for a date range. Shows who checked in, who is currently working, total count. Use for 'who is working today?', 'how many checked in?', 'attendance today'.",
      parameters: {
        type: "object",
        properties: {
          location_id: { type: "string", description: "Optional location UUID filter" },
          location_name: { type: "string", description: "Optional location name (partial match, auto-resolved to ID)" },
          from: { type: "string", description: "Start date YYYY-MM-DD" },
          to: { type: "string", description: "End date YYYY-MM-DD" },
          limit: { type: "number", description: "Max results (default 100)" },
        },
        required: ["from", "to"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_attendance_exceptions",
      description: "Get attendance exceptions ONLY (late arrivals, missed checkouts, no-shows) for a date range. For general attendance data, use get_attendance_summary instead.",
      parameters: {
        type: "object",
        properties: {
          location_id: { type: "string", description: "Optional location UUID filter" },
          location_name: { type: "string", description: "Optional location name (partial match, auto-resolved to ID)" },
          from: { type: "string", description: "Start date YYYY-MM-DD" },
          to: { type: "string", description: "End date YYYY-MM-DD" },
          limit: { type: "number", description: "Max results (default 50)" },
        },
        required: ["from", "to"],
      },
    },
  },
  // --- READ: Work Orders ---
  {
    type: "function",
    function: {
      name: "get_work_order_status",
      description: "Get work order summary (open, in progress, completed) optionally by location.",
      parameters: {
        type: "object",
        properties: {
          location_id: { type: "string" },
          status: { type: "string", enum: ["open", "in_progress", "completed", "cancelled"] },
          limit: { type: "number", description: "Max results (default 50)" },
        },
      },
    },
  },
  // --- READ: Documents ---
  {
    type: "function",
    function: {
      name: "get_document_expiries",
      description: "Get documents expiring soon or already expired.",
      parameters: {
        type: "object",
        properties: {
          days_ahead: { type: "number", description: "Look-ahead days (default 30)" },
        },
      },
    },
  },
  // --- READ: Training ---
  {
    type: "function",
    function: {
      name: "get_training_gaps",
      description: "Identify employees with incomplete or overdue training assignments.",
      parameters: {
        type: "object",
        properties: {
          location_id: { type: "string" },
        },
      },
    },
  },
  // --- SEARCH: Locations ---
  {
    type: "function",
    function: {
      name: "search_locations",
      description: "Search locations by name.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search text for location name" },
        },
        required: ["query"],
      },
    },
  },
  // --- FILE: Parse uploaded file ---
  {
    type: "function",
    function: {
      name: "parse_uploaded_file",
      description: "Parse an uploaded file (PDF, image, spreadsheet) to extract structured content. CRITICAL: When the user uploads ANY file (PDF, image, etc.) and asks to create an audit template, create an audit, or anything audit-related, you MUST call this tool with intent='audit_template'. For compliance/regulation documents, use intent='compliance_audit'. NEVER respond with text saying you cannot parse a file — ALWAYS call this tool instead.",
      parameters: {
        type: "object",
        properties: {
          file_url: { type: "string", description: "The signed URL of the uploaded file. Extract this from the [File URLs: ...] section in the user message." },
          file_name: { type: "string", description: "Original filename" },
          intent: { type: "string", enum: ["id_scan", "audit_template", "compliance_audit", "schedule_import", "document_parse", "general"], description: "What the user wants to do with the file. Use 'audit_template' for any audit template creation from a document. Use 'compliance_audit' for compliance/regulation documents." },
          regulation_name: { type: "string", description: "Name of the regulation/standard (only for compliance_audit intent)" },
          requested_template_name: { type: "string", description: "If the user explicitly specified a name for the audit template (e.g. 'name it TEST_Dash'), pass that exact name here. It will override the AI-extracted title." },
        },
        required: ["file_url", "file_name", "intent"],
      },
    },
  },
  // --- DRAFT: Create employee draft ---
  {
    type: "function",
    function: {
      name: "create_employee_draft",
      description: "Create an employee draft from extracted data (e.g., from an ID scan). Returns a preview for user approval before creating the actual employee record.",
      parameters: {
        type: "object",
        properties: {
          full_name: { type: "string", description: "Employee full name" },
          cnp: { type: "string", description: "Romanian CNP (personal numeric code)" },
          date_of_birth: { type: "string", description: "Date of birth YYYY-MM-DD" },
          id_series: { type: "string", description: "ID card series" },
          id_number: { type: "string", description: "ID card number" },
          address: { type: "string", description: "Address from ID" },
          location_name: { type: "string", description: "Target location name" },
          role: { type: "string", description: "Job role/position" },
          start_date: { type: "string", description: "Start date YYYY-MM-DD" },
        },
        required: ["full_name"],
      },
    },
  },
  // --- DRAFT: Create audit template draft ---
  {
    type: "function",
    function: {
      name: "create_audit_template_draft",
      description: "Create an audit template draft from extracted PDF content. Returns a structured preview with sections and fields for user approval.",
      parameters: {
        type: "object",
        properties: {
          template_name: { type: "string", description: "Name for the audit template" },
          description: { type: "string", description: "Template description" },
          sections: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                fields: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      field_type: { type: "string", enum: ["yes_no", "rating", "text", "number", "checkbox", "photo"] },
                      is_required: { type: "boolean" },
                    },
                    required: ["name", "field_type"],
                  },
                },
              },
              required: ["name", "fields"],
            },
            description: "Template sections with fields",
          },
          recurrence: { type: "string", enum: ["daily", "weekly", "monthly", "none"], description: "Suggested recurrence" },
          target_locations: { type: "string", enum: ["all", "specific"], description: "Which locations to assign to" },
        },
        required: ["template_name", "sections"],
      },
    },
  },
  // --- WRITE: Execute approved employee creation ---
  {
    type: "function",
    function: {
      name: "execute_employee_creation",
      description: "Execute the creation of an employee record after user has approved the draft. Only call this when the user explicitly approves/confirms the employee draft.",
      parameters: {
        type: "object",
        properties: {
          pending_action_id: { type: "string", description: "The pending action ID from the approval" },
          full_name: { type: "string" },
          cnp: { type: "string" },
          date_of_birth: { type: "string" },
          id_series: { type: "string" },
          id_number: { type: "string" },
          address: { type: "string" },
          location_id: { type: "string" },
          role: { type: "string" },
          start_date: { type: "string" },
          phone: { type: "string" },
          email: { type: "string" },
        },
        required: ["full_name", "location_id", "role"],
      },
    },
  },
  // --- WRITE: Execute approved audit template creation ---
  {
    type: "function",
    function: {
      name: "execute_audit_template_creation",
      description: "Execute the creation of an audit template after user has approved the draft. Only call this when the user explicitly approves/confirms the template draft.",
      parameters: {
        type: "object",
        properties: {
          pending_action_id: { type: "string", description: "The pending action ID from the approval" },
          template_name: { type: "string" },
          description: { type: "string" },
          sections: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                fields: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      field_type: { type: "string" },
                      is_required: { type: "boolean" },
                    },
                  },
                },
              },
            },
          },
        },
        required: ["template_name", "sections"],
      },
    },
  },
  // --- WRITE: Reassign corrective action ---
  {
    type: "function",
    function: {
      name: "reassign_corrective_action",
      description: "Reassign a corrective action to a different user. Requires explicit user confirmation for high-risk changes.",
      parameters: {
        type: "object",
        properties: {
          corrective_action_id: { type: "string", description: "The CA ID to reassign" },
          new_assigned_to: { type: "string", description: "New assignee user ID" },
          new_assigned_name: { type: "string", description: "Name of new assignee (for confirmation)" },
          reason: { type: "string", description: "Reason for reassignment" },
        },
        required: ["corrective_action_id", "new_assigned_to"],
      },
    },
  },
  // --- EXECUTE: CA reassignment after approval ---
  {
    type: "function",
    function: {
      name: "execute_ca_reassignment",
      description: "Execute corrective action reassignment after user approves. Only call after explicit user confirmation.",
      parameters: {
        type: "object",
        properties: {
          pending_action_id: { type: "string", description: "The pending action ID from the reassignment draft" },
        },
        required: ["pending_action_id"],
      },
    },
  },
  // --- DRAFT: Create shift draft ---
  {
    type: "function",
    function: {
      name: "create_shift_draft",
      description: "Create a shift draft for user approval before creating. Shows preview of the shift. When the user mentions a person, always include employee_name. Never ask for min_staff or max_staff — they default to 1.",
      parameters: {
        type: "object",
        properties: {
          location_name: { type: "string" },
          location_id: { type: "string" },
          role: { type: "string", description: "Role/position for the shift" },
          shift_date: { type: "string", description: "Date YYYY-MM-DD or 'today' or 'tomorrow'" },
          start_time: { type: "string", description: "Start time HH:MM" },
          end_time: { type: "string", description: "End time HH:MM" },
          shift_type: { type: "string", enum: ["regular", "extra", "training", "half", "extra_half"], description: "Shift type (default: regular). Use 'extra' for extra shifts, 'half' for half shifts, 'extra_half' for extra half shifts, 'training' for training shifts." },
          min_staff: { type: "number", description: "Optional. Minimum staff needed (default: 1, do NOT ask the user for this)" },
          max_staff: { type: "number", description: "Optional. Maximum staff (default: 1, do NOT ask the user for this)" },
          employee_name: { type: "string", description: "Full name of the employee to assign to this shift" },
          employee_id: { type: "string", description: "Employee ID to assign (if known)" },
        },
        required: ["role", "shift_date", "start_time", "end_time"],
      },
    },
  },
  // --- EXECUTE: Shift creation after approval ---
  {
    type: "function",
    function: {
      name: "execute_shift_creation",
      description: "Execute shift creation after user approves the draft. Only call after explicit user confirmation.",
      parameters: {
        type: "object",
        properties: {
          pending_action_id: { type: "string", description: "The pending action ID from the shift draft" },
        },
        required: ["pending_action_id"],
      },
    },
  },
  // --- DRAFT: Update shift ---
  {
    type: "function",
    function: {
      name: "update_shift_draft",
      description: "Update an existing shift (change time, date, role, shift type, or reassign employee). Creates a draft for approval. Use when user says 'change shift', 'move shift', 'update schedule', 'reschedule', 'mark as extra', 'change to training', 'set shift type'.",
      parameters: {
        type: "object",
        properties: {
          shift_id: { type: "string", description: "The shift UUID to update" },
          employee_name: { type: "string", description: "Current employee name to find the shift (alternative to shift_id)" },
          shift_date: { type: "string", description: "Current or new shift date YYYY-MM-DD" },
          location_name: { type: "string", description: "Location name to find the shift" },
          new_start_time: { type: "string", description: "New start time HH:MM (if changing)" },
          new_end_time: { type: "string", description: "New end time HH:MM (if changing)" },
          new_shift_date: { type: "string", description: "New date YYYY-MM-DD (if moving to different day)" },
          new_role: { type: "string", description: "New role (if changing)" },
          new_shift_type: { type: "string", enum: ["regular", "extra", "training", "half", "extra_half"], description: "New shift type: regular, extra, training, half, or extra_half" },
          new_employee_name: { type: "string", description: "New employee to assign (if reassigning)" },
          reason: { type: "string", description: "Reason for the change" },
        },
      },
    },
  },
  // --- EXECUTE: Update shift after approval ---
  {
    type: "function",
    function: {
      name: "execute_shift_update",
      description: "Execute shift update after user approves the draft. Only call after explicit user confirmation.",
      parameters: {
        type: "object",
        properties: {
          pending_action_id: { type: "string", description: "The pending action ID from the update draft" },
        },
        required: ["pending_action_id"],
      },
    },
  },
  // --- DRAFT: Delete/cancel shift ---
  {
    type: "function",
    function: {
      name: "delete_shift_draft",
      description: "Delete or cancel a shift. Creates a draft for approval. Use when user says 'remove shift', 'cancel shift', 'delete from schedule'.",
      parameters: {
        type: "object",
        properties: {
          shift_id: { type: "string", description: "The shift UUID to delete" },
          employee_name: { type: "string", description: "Employee name to find the shift" },
          shift_date: { type: "string", description: "Shift date YYYY-MM-DD to find the shift" },
          location_name: { type: "string", description: "Location name to find the shift" },
          start_time: { type: "string", description: "Shift start time HH:MM to disambiguate when employee has multiple shifts on same day" },
          end_time: { type: "string", description: "Shift end time HH:MM to disambiguate" },
          role: { type: "string", description: "Role/position (e.g. Chef, Auditor) to identify the specific shift" },
          reason: { type: "string", description: "Reason for deletion" },
        },
      },
    },
  },
  // --- EXECUTE: Delete shift after approval ---
  {
    type: "function",
    function: {
      name: "execute_shift_deletion",
      description: "Execute shift deletion after user approves. Only call after explicit user confirmation.",
      parameters: {
        type: "object",
        properties: {
          pending_action_id: { type: "string", description: "The pending action ID from the deletion draft" },
        },
        required: ["pending_action_id"],
      },
    },
  },
  // --- DRAFT: Swap shifts between employees ---
  {
    type: "function",
    function: {
      name: "swap_shift_draft",
      description: "Swap shifts between two employees. Creates a draft for approval. Use when user says 'swap shifts', 'switch schedule', 'trade shifts'.",
      parameters: {
        type: "object",
        properties: {
          employee_a_name: { type: "string", description: "First employee name" },
          employee_b_name: { type: "string", description: "Second employee name" },
          shift_date: { type: "string", description: "Date of shifts to swap YYYY-MM-DD" },
          location_name: { type: "string", description: "Location name (if needed to narrow down)" },
        },
        required: ["employee_a_name", "employee_b_name", "shift_date"],
      },
    },
  },
  // --- EXECUTE: Swap shifts after approval ---
  {
    type: "function",
    function: {
      name: "execute_shift_swap",
      description: "Execute shift swap after user approves. Only call after explicit user confirmation.",
      parameters: {
        type: "object",
        properties: {
          pending_action_id: { type: "string", description: "The pending action ID from the swap draft" },
        },
        required: ["pending_action_id"],
      },
    },
  },
  // ─── B2: Corrective Action Lifecycle ───
  {
    type: "function",
    function: {
      name: "create_ca_draft",
      description: "Create a new corrective action draft. Use when user says 'create CA', 'open corrective action', 'log a finding'.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "CA title" },
          description: { type: "string", description: "Detailed description" },
          severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
          location_name: { type: "string", description: "Location name" },
          location_id: { type: "string", description: "Location UUID" },
          owner_name: { type: "string", description: "Person responsible" },
          owner_user_id: { type: "string", description: "Owner user UUID" },
          due_at: { type: "string", description: "Due date ISO" },
          source_type: { type: "string", enum: ["manual", "audit", "observation"], description: "Source" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_ca_creation",
      description: "Execute CA creation after user approval.",
      parameters: { type: "object", properties: { pending_action_id: { type: "string" } }, required: ["pending_action_id"] },
    },
  },
  {
    type: "function",
    function: {
      name: "update_ca_status_draft",
      description: "Update a corrective action's status. Use when user says 'close CA', 'mark CA as done', 'change CA status'.",
      parameters: {
        type: "object",
        properties: {
          ca_id: { type: "string", description: "CA UUID" },
          ca_title: { type: "string", description: "CA title (partial match)" },
          new_status: { type: "string", enum: ["open", "in_progress", "pending_verification", "closed", "cancelled"] },
          reason: { type: "string" },
        },
        required: ["new_status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_ca_status_update",
      description: "Execute CA status update after user approval.",
      parameters: { type: "object", properties: { pending_action_id: { type: "string" } }, required: ["pending_action_id"] },
    },
  },
  // ─── B3: Employee Management ───
  {
    type: "function",
    function: {
      name: "update_employee_draft",
      description: "Update employee details (role, status, location, contact). Use when user says 'change role', 'transfer employee', 'update contact'.",
      parameters: {
        type: "object",
        properties: {
          employee_id: { type: "string" },
          employee_name: { type: "string", description: "Employee name (partial match)" },
          new_role: { type: "string" },
          new_status: { type: "string", enum: ["active", "inactive", "on_leave"] },
          new_email: { type: "string" },
          new_phone: { type: "string" },
          new_location_name: { type: "string" },
          new_location_id: { type: "string" },
          reason: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_employee_update",
      description: "Execute employee update after user approval.",
      parameters: { type: "object", properties: { pending_action_id: { type: "string" } }, required: ["pending_action_id"] },
    },
  },
  {
    type: "function",
    function: {
      name: "deactivate_employee_draft",
      description: "Deactivate an employee (soft delete). Use when user says 'deactivate', 'remove employee', 'terminate'.",
      parameters: {
        type: "object",
        properties: {
          employee_id: { type: "string" },
          employee_name: { type: "string" },
          reason: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_employee_deactivation",
      description: "Execute employee deactivation after user approval.",
      parameters: { type: "object", properties: { pending_action_id: { type: "string" } }, required: ["pending_action_id"] },
    },
  },
  // ─── B4: Attendance Corrections ───
  {
    type: "function",
    function: {
      name: "correct_attendance_draft",
      description: "Correct an attendance record (fix missed checkout, adjust clock-in). Use when user says 'fix checkout', 'correct attendance', 'add missing checkout'.",
      parameters: {
        type: "object",
        properties: {
          attendance_log_id: { type: "string" },
          employee_name: { type: "string" },
          date: { type: "string", description: "Date YYYY-MM-DD" },
          new_check_out: { type: "string", description: "New checkout time ISO" },
          new_check_in: { type: "string", description: "New check-in time ISO" },
          reason: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_attendance_correction",
      description: "Execute attendance correction after user approval.",
      parameters: { type: "object", properties: { pending_action_id: { type: "string" } }, required: ["pending_action_id"] },
    },
  },
  {
    type: "function",
    function: {
      name: "excuse_late_draft",
      description: "Excuse a late arrival. Use when user says 'excuse late', 'mark as excused', 'forgive lateness'.",
      parameters: {
        type: "object",
        properties: {
          attendance_log_id: { type: "string" },
          employee_name: { type: "string" },
          date: { type: "string", description: "Date YYYY-MM-DD" },
          reason: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_excuse_late",
      description: "Execute late excuse after user approval.",
      parameters: { type: "object", properties: { pending_action_id: { type: "string" } }, required: ["pending_action_id"] },
    },
  },
  // ─── B5: Work Order Management ───
  {
    type: "function",
    function: {
      name: "create_work_order_draft",
      description: "Create a new work order. Use when user says 'create work order', 'open maintenance request', 'log repair'.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
          location_name: { type: "string" },
          location_id: { type: "string" },
          assigned_name: { type: "string" },
          assigned_to: { type: "string" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_work_order_creation",
      description: "Execute work order creation after user approval.",
      parameters: { type: "object", properties: { pending_action_id: { type: "string" } }, required: ["pending_action_id"] },
    },
  },
  {
    type: "function",
    function: {
      name: "update_wo_status_draft",
      description: "Update work order status. Use when user says 'complete work order', 'close WO', 'mark WO in progress'.",
      parameters: {
        type: "object",
        properties: {
          wo_id: { type: "string" },
          wo_title: { type: "string", description: "WO title (partial match)" },
          new_status: { type: "string", enum: ["open", "in_progress", "completed", "cancelled"] },
          reason: { type: "string" },
        },
        required: ["new_status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_wo_status_update",
      description: "Execute WO status update after user approval.",
      parameters: { type: "object", properties: { pending_action_id: { type: "string" } }, required: ["pending_action_id"] },
    },
  },
  // ─── B6: Task Management ───
  {
    type: "function",
    function: {
      name: "create_task_draft",
      description: "Create a new task. Use when user says 'create task', 'add todo', 'assign task'.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
          location_name: { type: "string" },
          location_id: { type: "string" },
          due_date: { type: "string", description: "Due date YYYY-MM-DD" },
          assigned_name: { type: "string" },
          assigned_to: { type: "string" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_task_creation",
      description: "Execute task creation after user approval.",
      parameters: { type: "object", properties: { pending_action_id: { type: "string" } }, required: ["pending_action_id"] },
    },
  },
  // ─── B7: Training Management ───
  {
    type: "function",
    function: {
      name: "create_training_assignment_draft",
      description: "Assign training to an employee. Use when user says 'assign training', 'enroll in course', 'add training'.",
      parameters: {
        type: "object",
        properties: {
          employee_name: { type: "string" },
          employee_id: { type: "string" },
          module_name: { type: "string", description: "Training program name" },
          module_id: { type: "string" },
          start_date: { type: "string", description: "Start date YYYY-MM-DD" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_training_assignment",
      description: "Execute training assignment after user approval.",
      parameters: { type: "object", properties: { pending_action_id: { type: "string" } }, required: ["pending_action_id"] },
    },
  },
  {
    type: "function",
    function: {
      name: "update_training_status_draft",
      description: "Update training assignment status. Use when user says 'mark training complete', 'fail training', 'update training status'.",
      parameters: {
        type: "object",
        properties: {
          assignment_id: { type: "string" },
          employee_name: { type: "string" },
          module_name: { type: "string" },
          new_status: { type: "string", enum: ["assigned", "in_progress", "completed", "failed"] },
        },
        required: ["new_status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_training_status_update",
      description: "Execute training status update after user approval.",
      parameters: { type: "object", properties: { pending_action_id: { type: "string" } }, required: ["pending_action_id"] },
    },
  },
  // --- MEMORY: User preferences ---
  {
    type: "function",
    function: {
      name: "save_user_preference",
      description: "Save a user preference (e.g., preferred report format, default time window, favorite locations). Use when the user says 'remember that...', 'always use...', 'my default is...'.",
      parameters: {
        type: "object",
        properties: {
          preference_key: { type: "string", description: "Key name: 'report_format', 'default_time_window', 'favorite_locations', 'preferred_language', or custom key" },
          preference_value: { type: "object", description: "The preference value as a JSON object" },
        },
        required: ["preference_key", "preference_value"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_user_preferences",
      description: "Get all saved user preferences. Use to personalize responses (e.g., default date ranges, report format).",
      parameters: { type: "object", properties: {} },
    },
  },
  // --- MEMORY: Organization memory ---
  {
    type: "function",
    function: {
      name: "save_org_memory",
      description: "Save organization-level knowledge (terminology, standard processes, notes). Use when the user says 'we call X as Y', 'our standard process is...', 'note that...'.",
      parameters: {
        type: "object",
        properties: {
          memory_type: { type: "string", enum: ["terminology", "process", "standard", "note"], description: "Type of memory" },
          memory_key: { type: "string", description: "Short key identifier" },
          content: { type: "object", description: "The memory content as JSON" },
        },
        required: ["memory_type", "memory_key", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_org_memory",
      description: "Retrieve organization memory entries. Use to understand company-specific terminology and processes.",
      parameters: {
        type: "object",
        properties: {
          memory_type: { type: "string", enum: ["terminology", "process", "standard", "note"], description: "Filter by type" },
        },
      },
    },
  },
  // --- WORKFLOW: Save/list workflows ---
  {
    type: "function",
    function: {
      name: "save_workflow",
      description: "Save the current conversation as a reusable workflow shortcut. Use when user says 'save this as a workflow', 'remember this report', 'make this a shortcut'.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Short name for the workflow" },
          description: { type: "string", description: "What this workflow does" },
          prompt: { type: "string", description: "The prompt that triggers this workflow" },
          is_shared: { type: "boolean", description: "Whether other company users can see this workflow" },
        },
        required: ["name", "prompt"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_saved_workflows",
      description: "List all saved workflow shortcuts for the user.",
      parameters: { type: "object", properties: {} },
    },
  },
  // --- FILE: Spreadsheet to schedule import ---
  {
    type: "function",
    function: {
      name: "transform_spreadsheet_to_schedule",
      description: "Parse an uploaded spreadsheet (CSV/Excel) and extract schedule data (shifts, assignments). Use when user uploads a spreadsheet intending to import a schedule.",
      parameters: {
        type: "object",
        properties: {
          file_url: { type: "string", description: "Signed URL of the uploaded file" },
          file_name: { type: "string", description: "Original filename" },
        },
        required: ["file_url", "file_name"],
      },
    },
  },
  // --- FILE: SOP to training module ---
  {
    type: "function",
    function: {
      name: "transform_sop_to_training",
      description: "Parse an uploaded SOP/procedure document and extract it as a training module draft with sections, key points, and quiz questions.",
      parameters: {
        type: "object",
        properties: {
          file_url: { type: "string", description: "Signed URL of the uploaded file" },
          file_name: { type: "string", description: "Original filename" },
          module_name: { type: "string", description: "Name for the training module" },
        },
        required: ["file_url", "file_name"],
      },
    },
  },
  // ─── TIME-OFF: Capability Layer Tools ───
  {
    type: "function",
    function: {
      name: "get_time_off_balance",
      description: "Get vacation/leave balance for an employee: total days, used, remaining.",
      parameters: {
        type: "object",
        properties: {
          employee_name: { type: "string", description: "Employee name (partial match)" },
          employee_id: { type: "string", description: "Employee UUID (if known)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_time_off_requests",
      description: "List time-off/vacation/sick leave requests with optional filters by employee, status, or date range.",
      parameters: {
        type: "object",
        properties: {
          employee_name: { type: "string", description: "Filter by employee name" },
          status: { type: "string", enum: ["pending", "approved", "rejected"], description: "Filter by status" },
          from: { type: "string", description: "Start date YYYY-MM-DD" },
          to: { type: "string", description: "End date YYYY-MM-DD" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_pending_time_off_approvals",
      description: "List all pending time-off requests awaiting approval across the company.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "check_time_off_conflicts",
      description: "Check if a proposed time-off period would conflict with existing requests or team schedules.",
      parameters: {
        type: "object",
        properties: {
          employee_name: { type: "string", description: "Employee name" },
          employee_id: { type: "string", description: "Employee UUID" },
          start_date: { type: "string", description: "Start date YYYY-MM-DD" },
          end_date: { type: "string", description: "End date YYYY-MM-DD" },
        },
        required: ["start_date", "end_date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_team_time_off_calendar",
      description: "Get who is off during a date range, optionally filtered by location. Useful for 'who is off next Friday?' questions.",
      parameters: {
        type: "object",
        properties: {
          location_name: { type: "string", description: "Filter by location name" },
          from: { type: "string", description: "Start date YYYY-MM-DD" },
          to: { type: "string", description: "End date YYYY-MM-DD" },
        },
        required: ["from", "to"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_time_off_request_draft",
      description: "Create a time-off request draft for approval. Use for vacation, sick leave, personal days.",
      parameters: {
        type: "object",
        properties: {
          employee_name: { type: "string", description: "Employee name" },
          employee_id: { type: "string", description: "Employee UUID" },
          start_date: { type: "string", description: "Start date YYYY-MM-DD" },
          end_date: { type: "string", description: "End date YYYY-MM-DD" },
          request_type: { type: "string", enum: ["vacation", "sick", "personal", "unpaid", "other"], description: "Type of leave" },
          reason: { type: "string", description: "Optional reason" },
        },
        required: ["start_date", "end_date", "request_type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_time_off_request",
      description: "Execute time-off request creation after user approval.",
      parameters: {
        type: "object",
        properties: {
          pending_action_id: { type: "string", description: "The pending action ID" },
        },
        required: ["pending_action_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "approve_time_off_request_draft",
      description: "Create a draft to approve a pending time-off request. Shows impact preview.",
      parameters: {
        type: "object",
        properties: {
          request_id: { type: "string", description: "Time-off request UUID" },
          employee_name: { type: "string", description: "Employee name (resolves most recent pending request)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_time_off_approval",
      description: "Execute time-off approval after user confirms.",
      parameters: {
        type: "object",
        properties: {
          pending_action_id: { type: "string", description: "The pending action ID" },
        },
        required: ["pending_action_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "reject_time_off_request_dash",
      description: "Reject a pending time-off request with optional reason.",
      parameters: {
        type: "object",
        properties: {
          request_id: { type: "string", description: "Time-off request UUID" },
          employee_name: { type: "string", description: "Employee name" },
          rejection_reason: { type: "string", description: "Reason for rejection" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cancel_time_off_request_dash",
      description: "Cancel a time-off request (delete). Employee can cancel own, managers can cancel any.",
      parameters: {
        type: "object",
        properties: {
          request_id: { type: "string", description: "Time-off request UUID" },
        },
        required: ["request_id"],
      },
    },
  },

  // ─── Audit Scheduling ───
  {
    type: "function",
    function: {
      name: "list_scheduled_audits",
      description: "List scheduled audits for the company, with optional filters for status, date range, or location.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["scheduled", "in_progress", "completed", "cancelled"], description: "Filter by status" },
          from: { type: "string", description: "Start date filter (YYYY-MM-DD)" },
          to: { type: "string", description: "End date filter (YYYY-MM-DD)" },
          location_name: { type: "string", description: "Filter by location name" },
          limit: { type: "number", description: "Max results (default 20)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "schedule_audit_draft",
      description: "Draft a new scheduled audit for a specific location and template. Shows a preview before creating.",
      parameters: {
        type: "object",
        properties: {
          template_name: { type: "string", description: "Audit template name (fuzzy matched)" },
          template_id: { type: "string", description: "Audit template UUID" },
          location_name: { type: "string", description: "Location name (fuzzy matched)" },
          location_id: { type: "string", description: "Location UUID" },
          scheduled_for: { type: "string", description: "Scheduled date (YYYY-MM-DD)" },
          frequency: { type: "string", enum: ["once", "daily", "weekly", "monthly"], description: "Recurrence frequency" },
          assignee_name: { type: "string", description: "Name of person to assign the audit to" },
        },
        required: ["scheduled_for"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_audit_scheduling",
      description: "Execute a previously drafted audit scheduling action.",
      parameters: {
        type: "object",
        properties: {
          pending_action_id: { type: "string", description: "Pending action UUID from schedule_audit_draft" },
        },
        required: ["pending_action_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cancel_scheduled_audit_draft",
      description: "Draft a cancellation for a scheduled audit. Shows a preview before cancelling.",
      parameters: {
        type: "object",
        properties: {
          scheduled_audit_id: { type: "string", description: "Scheduled audit UUID" },
          reason: { type: "string", description: "Reason for cancellation" },
        },
        required: ["scheduled_audit_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_cancel_scheduled_audit",
      description: "Execute a drafted audit cancellation.",
      parameters: {
        type: "object",
        properties: {
          pending_action_id: { type: "string", description: "Pending action UUID from cancel_scheduled_audit_draft" },
        },
        required: ["pending_action_id"],
      },
    },
  },

  // ─── Location Management ───
  {
    type: "function",
    function: {
      name: "list_locations",
      description: "List all locations for the company. Optionally filter by status or type.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["active", "inactive"], description: "Filter by status" },
          type: { type: "string", description: "Filter by location type" },
          limit: { type: "number", description: "Max results (default 50)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_location_details",
      description: "Get detailed information about a specific location including employee count.",
      parameters: {
        type: "object",
        properties: {
          location_id: { type: "string", description: "Location UUID" },
          location_name: { type: "string", description: "Location name (fuzzy matched)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_location_draft",
      description: "Draft a new location. Shows a preview before creating.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Location name" },
          address: { type: "string", description: "Street address" },
          city: { type: "string", description: "City" },
          type: { type: "string", description: "Location type (e.g. store, warehouse, office)" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_location_creation",
      description: "Execute a drafted location creation.",
      parameters: {
        type: "object",
        properties: {
          pending_action_id: { type: "string", description: "Pending action UUID from create_location_draft" },
        },
        required: ["pending_action_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_location_draft",
      description: "Draft an update to an existing location. Shows a preview before applying.",
      parameters: {
        type: "object",
        properties: {
          location_id: { type: "string", description: "Location UUID" },
          location_name: { type: "string", description: "Current location name (fuzzy matched)" },
          name: { type: "string", description: "New name" },
          address: { type: "string", description: "New address" },
          city: { type: "string", description: "New city" },
          type: { type: "string", description: "New type" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_location_update",
      description: "Execute a drafted location update.",
      parameters: {
        type: "object",
        properties: {
          pending_action_id: { type: "string", description: "Pending action UUID from update_location_draft" },
        },
        required: ["pending_action_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "deactivate_location_draft",
      description: "Draft a location deactivation. Shows active employee count warning before deactivating.",
      parameters: {
        type: "object",
        properties: {
          location_id: { type: "string", description: "Location UUID" },
          location_name: { type: "string", description: "Location name (fuzzy matched)" },
          reason: { type: "string", description: "Reason for deactivation" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_location_deactivation",
      description: "Execute a drafted location deactivation.",
      parameters: {
        type: "object",
        properties: {
          pending_action_id: { type: "string", description: "Pending action UUID from deactivate_location_draft" },
        },
        required: ["pending_action_id"],
      },
    },
  },

  // ─── Notifications ───
  {
    type: "function",
    function: {
      name: "list_notifications",
      description: "List notifications that have been sent or scheduled for the company.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Max results (default 20)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_notification_draft",
      description: "Draft a notification to send to employees by role. Shows a preview before sending.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Notification title" },
          message: { type: "string", description: "Notification body message" },
          target_roles: { type: "array", items: { type: "string" }, description: "Roles to target (e.g. ['staff', 'manager'])" },
          type: { type: "string", enum: ["info", "warning", "urgent"], description: "Notification type" },
          scheduled_for: { type: "string", description: "Optional scheduled send time (ISO 8601)" },
        },
        required: ["title", "message"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_notification_send",
      description: "Execute a drafted notification send.",
      parameters: {
        type: "object",
        properties: {
          pending_action_id: { type: "string", description: "Pending action UUID from send_notification_draft" },
        },
        required: ["pending_action_id"],
      },
    },
  },

  // ─── Departments ───
  {
    type: "function",
    function: {
      name: "list_departments",
      description: "List all departments in the company.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Max results (default 100)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_department_draft",
      description: "Draft a new department. Shows a preview before creating.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Department name" },
          description: { type: "string", description: "Department description" },
          color: { type: "string", description: "Color hex code (e.g. #FF5733)" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_create_department",
      description: "Execute a drafted department creation.",
      parameters: {
        type: "object",
        properties: {
          pending_action_id: { type: "string", description: "Pending action UUID from create_department_draft" },
        },
        required: ["pending_action_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_department_draft",
      description: "Draft an update to an existing department.",
      parameters: {
        type: "object",
        properties: {
          department_id: { type: "string", description: "Department UUID" },
          department_name: { type: "string", description: "Current department name (fuzzy matched)" },
          name: { type: "string", description: "New name" },
          description: { type: "string", description: "New description" },
          color: { type: "string", description: "New color hex code" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_update_department",
      description: "Execute a drafted department update.",
      parameters: {
        type: "object",
        properties: {
          pending_action_id: { type: "string", description: "Pending action UUID from update_department_draft" },
        },
        required: ["pending_action_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_department_draft",
      description: "Draft a department deletion. Shows employee count before allowing deletion.",
      parameters: {
        type: "object",
        properties: {
          department_id: { type: "string", description: "Department UUID" },
          department_name: { type: "string", description: "Department name (fuzzy matched)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_delete_department",
      description: "Execute a drafted department deletion.",
      parameters: {
        type: "object",
        properties: {
          pending_action_id: { type: "string", description: "Pending action UUID from delete_department_draft" },
        },
        required: ["pending_action_id"],
      },
    },
  },

  // ─── Tasks Extended ───
  {
    type: "function",
    function: {
      name: "list_tasks",
      description: "List tasks for the company. Optionally filter by status or priority.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["open", "in_progress", "completed", "cancelled"], description: "Filter by status" },
          priority: { type: "string", enum: ["low", "medium", "high", "urgent"], description: "Filter by priority" },
          limit: { type: "number", description: "Max results (default 50)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_task_draft",
      description: "Draft an update to an existing task (title, status, priority, due date).",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "string", description: "Task UUID" },
          title: { type: "string", description: "New title" },
          status: { type: "string", enum: ["open", "in_progress", "completed", "cancelled"], description: "New status" },
          priority: { type: "string", enum: ["low", "medium", "high", "urgent"], description: "New priority" },
          due_date: { type: "string", description: "New due date (YYYY-MM-DD)" },
        },
        required: ["task_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_task_update",
      description: "Execute a drafted task update.",
      parameters: {
        type: "object",
        properties: {
          pending_action_id: { type: "string", description: "Pending action UUID from update_task_draft" },
        },
        required: ["pending_action_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_task_draft",
      description: "Draft a task deletion. Shows preview before deleting.",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "string", description: "Task UUID" },
        },
        required: ["task_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_task_deletion",
      description: "Execute a drafted task deletion.",
      parameters: {
        type: "object",
        properties: {
          pending_action_id: { type: "string", description: "Pending action UUID from delete_task_draft" },
        },
        required: ["pending_action_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "complete_task_draft",
      description: "Draft marking a task as completed.",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "string", description: "Task UUID" },
          notes: { type: "string", description: "Optional completion notes" },
        },
        required: ["task_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_task_completion",
      description: "Execute a drafted task completion.",
      parameters: {
        type: "object",
        properties: {
          pending_action_id: { type: "string", description: "Pending action UUID from complete_task_draft" },
        },
        required: ["pending_action_id"],
      },
    },
  },

  // ─── Documents ───
  {
    type: "function",
    function: {
      name: "list_documents",
      description: "List documents in the company library. Optionally filter by category.",
      parameters: {
        type: "object",
        properties: {
          category_name: { type: "string", description: "Filter by document category name" },
          limit: { type: "number", description: "Max results (default 50)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "link_document_draft",
      description: "Draft linking a pre-existing document URL to the company document library.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Document title" },
          file_url: { type: "string", description: "Existing file URL (must be a valid URL)" },
          file_type: { type: "string", description: "File type (e.g. pdf, docx)" },
          category_id: { type: "string", description: "Document category UUID" },
          expiry_date: { type: "string", description: "Expiry date (YYYY-MM-DD)" },
          description: { type: "string", description: "Document description" },
        },
        required: ["title", "file_url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_document_link",
      description: "Execute a drafted document link.",
      parameters: {
        type: "object",
        properties: {
          pending_action_id: { type: "string", description: "Pending action UUID from link_document_draft" },
        },
        required: ["pending_action_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_document_category_draft",
      description: "Draft creating a new document category.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Category name" },
          description: { type: "string", description: "Category description" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_document_category_creation",
      description: "Execute a drafted document category creation.",
      parameters: {
        type: "object",
        properties: {
          pending_action_id: { type: "string", description: "Pending action UUID from create_document_category_draft" },
        },
        required: ["pending_action_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_document_draft",
      description: "Draft a document deletion.",
      parameters: {
        type: "object",
        properties: {
          document_id: { type: "string", description: "Document UUID" },
        },
        required: ["document_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_document_deletion",
      description: "Execute a drafted document deletion.",
      parameters: {
        type: "object",
        properties: {
          pending_action_id: { type: "string", description: "Pending action UUID from delete_document_draft" },
        },
        required: ["pending_action_id"],
      },
    },
  },

  // ─── Alerts ───
  {
    type: "function",
    function: {
      name: "list_alerts",
      description: "List open or resolved alerts for the company. Defaults to unresolved alerts.",
      parameters: {
        type: "object",
        properties: {
          severity: { type: "string", enum: ["info", "warning", "critical"], description: "Filter by severity" },
          category: { type: "string", description: "Filter by category (e.g. staff, audit, maintenance)" },
          resolved: { type: "boolean", description: "true=resolved, false=open (default false)" },
          limit: { type: "number", description: "Max results (default 50)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "resolve_alert_draft",
      description: "Draft a resolution for an open alert. Shows preview before resolving.",
      parameters: {
        type: "object",
        properties: {
          alert_id: { type: "string", description: "Alert UUID" },
          resolution_note: { type: "string", description: "Optional resolution note" },
        },
        required: ["alert_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_alert_resolution",
      description: "Execute a drafted alert resolution.",
      parameters: {
        type: "object",
        properties: {
          pending_action_id: { type: "string", description: "Pending action UUID from resolve_alert_draft" },
        },
        required: ["pending_action_id"],
      },
    },
  },

  // ─── Training Programs ───
  {
    type: "function",
    function: {
      name: "list_training_programs",
      description: "List all training programs available in the company.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Max results (default 50)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_training_program_draft",
      description: "Draft a new training program (module). Shows preview before creating.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Program name" },
          description: { type: "string", description: "Program description" },
          duration_hours: { type: "number", description: "Duration in hours" },
          is_mandatory: { type: "boolean", description: "Whether the program is mandatory (default false)" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_training_program_creation",
      description: "Execute a drafted training program creation.",
      parameters: {
        type: "object",
        properties: {
          pending_action_id: { type: "string", description: "Pending action UUID from create_training_program_draft" },
        },
        required: ["pending_action_id"],
      },
    },
  },
  // ─── Tests & Assessments ───
  {
    type: "function",
    function: {
      name: "list_tests",
      description: "List all tests/assessments in the company. Use when user asks 'what tests do we have?', 'show me all tests', 'list assessments'.",
      parameters: {
        type: "object",
        properties: {
          active_only: { type: "boolean", description: "Only return active tests (default true)" },
          limit: { type: "number", description: "Max results (default 50)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_test_results",
      description: "Get test submission results. Filter by test name or employee name.",
      parameters: {
        type: "object",
        properties: {
          test_name: { type: "string", description: "Test name (partial match)" },
          test_id: { type: "string", description: "Test UUID" },
          employee_name: { type: "string", description: "Filter by employee name" },
          from: { type: "string", description: "Start date YYYY-MM-DD" },
          to: { type: "string", description: "End date YYYY-MM-DD" },
          limit: { type: "number", description: "Max results (default 50)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_test_assignments",
      description: "List test assignments (who has which test assigned, and whether completed).",
      parameters: {
        type: "object",
        properties: {
          employee_name: { type: "string", description: "Filter by employee name" },
          test_name: { type: "string", description: "Filter by test name" },
          completed: { type: "boolean", description: "Filter by completion status" },
          limit: { type: "number", description: "Max results (default 50)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "assign_test_draft",
      description: "Assign a test to an employee. Creates a draft for approval.",
      parameters: {
        type: "object",
        properties: {
          test_name: { type: "string", description: "Test name (partial match)" },
          test_id: { type: "string", description: "Test UUID (if known)" },
          employee_name: { type: "string", description: "Employee name" },
          employee_id: { type: "string", description: "Employee UUID (if known)" },
        },
        required: ["employee_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_test_assignment",
      description: "Execute a test assignment after user approves the draft.",
      parameters: {
        type: "object",
        properties: {
          pending_action_id: { type: "string", description: "Pending action UUID from assign_test_draft" },
        },
        required: ["pending_action_id"],
      },
    },
  },
  // ─── Employee Warnings ───
  {
    type: "function",
    function: {
      name: "list_employee_warnings",
      description: "List warnings issued to employees. Use when asked 'show warnings for [employee]', 'how many warnings does X have?', 'warning history'.",
      parameters: {
        type: "object",
        properties: {
          employee_name: { type: "string", description: "Filter by employee name" },
          location_name: { type: "string", description: "Filter by location" },
          from: { type: "string", description: "Start date YYYY-MM-DD" },
          to: { type: "string", description: "End date YYYY-MM-DD" },
          limit: { type: "number", description: "Max results (default 50)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "issue_warning_draft",
      description: "Issue a warning or coaching note to an employee. Creates a draft for approval.",
      parameters: {
        type: "object",
        properties: {
          employee_name: { type: "string", description: "Employee name" },
          employee_id: { type: "string", description: "Employee UUID (if known)" },
          event_type: { type: "string", enum: ["warning", "coaching_note"], description: "Type of event (default: warning)" },
          severity: { type: "string", enum: ["minor", "major", "critical"], description: "Warning severity (default: minor)" },
          description: { type: "string", description: "Description/reason for the warning" },
          category: { type: "string", description: "Warning category (e.g. attendance, conduct, performance)" },
          notes: { type: "string", description: "Additional notes" },
        },
        required: ["employee_name", "description"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_warning_issuance",
      description: "Execute a warning issuance after user approves the draft.",
      parameters: {
        type: "object",
        properties: {
          pending_action_id: { type: "string", description: "Pending action UUID from issue_warning_draft" },
        },
        required: ["pending_action_id"],
      },
    },
  },
  // ─── Employee Dossier ───
  {
    type: "function",
    function: {
      name: "get_employee_dossier",
      description: "Get a full profile snapshot for an employee: role, location, recent attendance, warnings, training status, last test score, open corrective actions. Use for 'show me [name]'s profile', 'full info on [name]', 'employee dossier'.",
      parameters: {
        type: "object",
        properties: {
          employee_name: { type: "string", description: "Employee name (partial match)" },
          employee_id: { type: "string", description: "Employee UUID (if known)" },
        },
      },
    },
  },
  // ─── Shift Publish/Unpublish ───
  {
    type: "function",
    function: {
      name: "publish_shifts_draft",
      description: "Publish or unpublish shifts for a location and date range. Creates a draft showing how many shifts will be affected. Use for 'publish shifts', 'unpublish schedule', 'release schedule'.",
      parameters: {
        type: "object",
        properties: {
          location_name: { type: "string", description: "Location name" },
          location_id: { type: "string", description: "Location UUID (if known)" },
          from_date: { type: "string", description: "Start date YYYY-MM-DD" },
          to_date: { type: "string", description: "End date YYYY-MM-DD (if range)" },
          shift_date: { type: "string", description: "Single date YYYY-MM-DD (alternative to from_date/to_date)" },
          publish: { type: "boolean", description: "true to publish, false to unpublish (default: true)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_publish_shifts",
      description: "Execute shift publish/unpublish after user approves the draft.",
      parameters: {
        type: "object",
        properties: {
          pending_action_id: { type: "string", description: "Pending action UUID from publish_shifts_draft" },
        },
        required: ["pending_action_id"],
      },
    },
  },
  // ─── Manual Clock-In ───
  {
    type: "function",
    function: {
      name: "manual_clock_in_draft",
      description: "Manually record an attendance entry (clock-in) for an employee. Creates a draft for approval. Use for 'manually clock in [employee]', 'add attendance entry', 'record clock-in'.",
      parameters: {
        type: "object",
        properties: {
          employee_name: { type: "string", description: "Employee name" },
          employee_id: { type: "string", description: "Employee UUID (if known)" },
          check_in_time: { type: "string", description: "Clock-in time ISO 8601 or HH:MM (today assumed if only time given)" },
          check_out_time: { type: "string", description: "Clock-out time (optional, can be added later)" },
          location_name: { type: "string", description: "Location name" },
          location_id: { type: "string", description: "Location UUID (if known)" },
          reason: { type: "string", description: "Reason for manual entry" },
        },
        required: ["employee_name", "check_in_time"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_manual_clock_in",
      description: "Execute a manual clock-in entry after user approves the draft.",
      parameters: {
        type: "object",
        properties: {
          pending_action_id: { type: "string", description: "Pending action UUID from manual_clock_in_draft" },
        },
        required: ["pending_action_id"],
      },
    },
  },
  // ─── CMMS Assets ───
  {
    type: "function",
    function: {
      name: "list_assets",
      description: "List equipment/assets. Use for 'show me equipment', 'list assets', 'what equipment do we have?'.",
      parameters: {
        type: "object",
        properties: {
          location_name: { type: "string", description: "Filter by location name" },
          status: { type: "string", enum: ["active", "inactive", "under_maintenance", "retired"], description: "Filter by asset status" },
          limit: { type: "number", description: "Max results (default 50)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_asset_details",
      description: "Get detailed info about a specific asset including recent work orders.",
      parameters: {
        type: "object",
        properties: {
          asset_name: { type: "string", description: "Asset name (partial match)" },
          asset_id: { type: "string", description: "Asset UUID (if known)" },
        },
      },
    },
  },
  // ─── Labor Costs ───
  {
    type: "function",
    function: {
      name: "get_labor_costs",
      description: "Get labor cost summary for a date range, optionally by location. Shows total hours and costs.",
      parameters: {
        type: "object",
        properties: {
          location_name: { type: "string", description: "Filter by location name" },
          from: { type: "string", description: "Start date YYYY-MM-DD" },
          to: { type: "string", description: "End date YYYY-MM-DD" },
        },
        required: ["from", "to"],
      },
    },
  },
  // ─── Training Sessions ───
  {
    type: "function",
    function: {
      name: "list_training_sessions",
      description: "List training sessions scheduled or completed. Use for 'show training sessions', 'upcoming training', 'training schedule'.",
      parameters: {
        type: "object",
        properties: {
          location_name: { type: "string", description: "Filter by location" },
          from: { type: "string", description: "Start date YYYY-MM-DD" },
          to: { type: "string", description: "End date YYYY-MM-DD" },
          program_name: { type: "string", description: "Filter by training program name" },
          limit: { type: "number", description: "Max results (default 20)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_training_session_draft",
      description: "Schedule a training session. Creates a draft for approval.",
      parameters: {
        type: "object",
        properties: {
          program_name: { type: "string", description: "Training program name (partial match)" },
          program_id: { type: "string", description: "Training program UUID (if known)" },
          location_name: { type: "string", description: "Location name" },
          session_date: { type: "string", description: "Session date YYYY-MM-DD" },
          start_time: { type: "string", description: "Start time HH:MM" },
          end_time: { type: "string", description: "End time HH:MM" },
          trainer_name: { type: "string", description: "Trainer employee name (optional)" },
          max_attendees: { type: "number", description: "Maximum attendees (optional)" },
        },
        required: ["session_date", "start_time", "end_time"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_training_session_creation",
      description: "Execute a training session creation after user approves the draft.",
      parameters: {
        type: "object",
        properties: {
          pending_action_id: { type: "string", description: "Pending action UUID from create_training_session_draft" },
        },
        required: ["pending_action_id"],
      },
    },
  },
  // --- READ: Scout Jobs ---
  {
    type: "function",
    function: {
      name: "list_scout_jobs",
      description: "List scout jobs for this company. Filter by status, location, or date range.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Filter by status: draft, posted, accepted, in_progress, submitted, approved, rejected, paid, cancelled, expired" },
          location_name: { type: "string", description: "Location name filter (partial match)" },
          from: { type: "string", description: "Start date YYYY-MM-DD" },
          to: { type: "string", description: "End date YYYY-MM-DD" },
          limit: { type: "number", description: "Max results (default 50)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_scout_job_details",
      description: "Get full details for a specific scout job including submissions.",
      parameters: {
        type: "object",
        properties: {
          job_id: { type: "string", description: "Scout job UUID" },
          job_title: { type: "string", description: "Job title (partial match) if ID unknown" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_scout_submissions",
      description: "List scout submissions for company's jobs. Filter by status or specific job.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Filter by status: pending_review, approved, rejected, resubmit_required" },
          job_id: { type: "string", description: "Filter by specific job UUID" },
          limit: { type: "number", description: "Max results (default 50)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "review_scout_submission_draft",
      description: "Create a draft to review (approve/reject/request resubmission of) a scout submission.",
      parameters: {
        type: "object",
        properties: {
          submission_id: { type: "string", description: "Scout submission UUID" },
          action: { type: "string", enum: ["approve", "reject", "request_resubmit"], description: "Review action" },
          reviewer_notes: { type: "string", description: "Optional notes for the scout" },
        },
        required: ["submission_id", "action"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_scout_submission_review",
      description: "Execute a scout submission review after user approves the draft.",
      parameters: {
        type: "object",
        properties: {
          pending_action_id: { type: "string", description: "Pending action UUID from review_scout_submission_draft" },
        },
        required: ["pending_action_id"],
      },
    },
  },
  // --- READ: Waste Management ---
  {
    type: "function",
    function: {
      name: "get_waste_report",
      description: "Get a waste report with KPIs, top wasted products, and breakdown by category. Optionally filter by location and date range.",
      parameters: {
        type: "object",
        properties: {
          location_name: { type: "string", description: "Location name filter (partial match). Omit for all locations." },
          from: { type: "string", description: "Start date YYYY-MM-DD" },
          to: { type: "string", description: "End date YYYY-MM-DD" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_waste_entries",
      description: "List individual waste log entries. Filter by location, status, or date range.",
      parameters: {
        type: "object",
        properties: {
          location_name: { type: "string", description: "Location name filter" },
          status: { type: "string", description: "Entry status (default: recorded)" },
          from: { type: "string", description: "Start date YYYY-MM-DD" },
          to: { type: "string", description: "End date YYYY-MM-DD" },
          limit: { type: "number", description: "Max results (default 50)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_waste_products",
      description: "List all active waste products for this company (name, category, unit cost).",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_waste_draft",
      description: "Create a draft to log a waste entry. Requires product name, location, and weight.",
      parameters: {
        type: "object",
        properties: {
          product_name: { type: "string", description: "Waste product name (partial match)" },
          location_name: { type: "string", description: "Location name where waste occurred" },
          weight_kg: { type: "number", description: "Weight in kilograms" },
          weight_g: { type: "number", description: "Weight in grams (use weight_kg or weight_g)" },
          reason_name: { type: "string", description: "Waste reason name (optional)" },
          notes: { type: "string", description: "Optional notes" },
          occurred_at: { type: "string", description: "ISO timestamp when waste occurred (default: now)" },
        },
        required: ["product_name", "location_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_waste_entry",
      description: "Execute a waste entry log after user approves the draft.",
      parameters: {
        type: "object",
        properties: {
          pending_action_id: { type: "string", description: "Pending action UUID from log_waste_draft" },
        },
        required: ["pending_action_id"],
      },
    },
  },
  // --- CA Items ---
  {
    type: "function",
    function: {
      name: "list_ca_items",
      description: "List corrective action items (sub-tasks) for a specific corrective action.",
      parameters: {
        type: "object",
        properties: {
          ca_id: { type: "string", description: "Corrective action UUID" },
          status: { type: "string", description: "Filter by status: open, in_progress, done, verified, rejected" },
        },
        required: ["ca_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_ca_item_status_draft",
      description: "Create a draft to update the status of a corrective action item.",
      parameters: {
        type: "object",
        properties: {
          item_id: { type: "string", description: "CA item UUID" },
          new_status: { type: "string", enum: ["open", "in_progress", "done", "verified", "rejected"], description: "New status" },
          notes: { type: "string", description: "Optional update notes" },
        },
        required: ["item_id", "new_status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_update_ca_item_status",
      description: "Execute a CA item status update after user approves the draft.",
      parameters: {
        type: "object",
        properties: {
          pending_action_id: { type: "string", description: "Pending action UUID from update_ca_item_status_draft" },
        },
        required: ["pending_action_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_ca_item_draft",
      description: "Create a draft to add a new action item to an existing corrective action.",
      parameters: {
        type: "object",
        properties: {
          ca_id: { type: "string", description: "Corrective action UUID" },
          title: { type: "string", description: "Item title/description" },
          assigned_to: { type: "string", description: "Employee UUID to assign to (optional)" },
          assigned_name: { type: "string", description: "Employee name to assign to (partial match, optional)" },
          due_date: { type: "string", description: "Due date YYYY-MM-DD (optional)" },
        },
        required: ["ca_id", "title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_add_ca_item",
      description: "Execute adding a CA item after user approves the draft.",
      parameters: {
        type: "object",
        properties: {
          pending_action_id: { type: "string", description: "Pending action UUID from add_ca_item_draft" },
        },
        required: ["pending_action_id"],
      },
    },
  },
  // --- READ: Payroll ---
  {
    type: "function",
    function: {
      name: "list_payroll_periods",
      description: "List payroll periods for this company. Filter by status or date range.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Filter by status: draft, calculated, approved, paid, closed" },
          from: { type: "string", description: "Start date YYYY-MM-DD" },
          to: { type: "string", description: "End date YYYY-MM-DD" },
          limit: { type: "number", description: "Max results (default 20)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_payroll_summary",
      description: "Get detailed payroll summary for a specific period, including totals by location and top earners.",
      parameters: {
        type: "object",
        properties: {
          period_id: { type: "string", description: "Payroll period UUID" },
          period_name: { type: "string", description: "Period name (partial match) if ID unknown. Omit for most recent period." },
        },
      },
    },
  },
  // --- READ: Employee Performance ---
  {
    type: "function",
    function: {
      name: "get_employee_performance_report",
      description: "Get monthly performance scores for employees. Filter by location, employee name, or month.",
      parameters: {
        type: "object",
        properties: {
          location_name: { type: "string", description: "Location name filter (partial match)" },
          employee_name: { type: "string", description: "Employee name filter (partial match)" },
          month: { type: "string", description: "Month filter YYYY-MM (e.g. 2026-03)" },
        },
      },
    },
  },
  // --- Equipment Management ---
  {
    type: "function",
    function: {
      name: "list_equipment",
      description: "List equipment assets by location, status, or upcoming check dates.",
      parameters: {
        type: "object",
        properties: {
          location_name: { type: "string", description: "Location name filter (partial match)" },
          status: { type: "string", description: "Filter by status: active, inactive, maintenance, retired" },
          limit: { type: "number", description: "Max results (default 50)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_equipment_details",
      description: "Get full details and intervention history for a specific piece of equipment.",
      parameters: {
        type: "object",
        properties: {
          equipment_id: { type: "string", description: "Equipment UUID" },
          equipment_name: { type: "string", description: "Equipment name (partial match) if ID unknown" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_equipment_expiries",
      description: "List equipment due for a check or with overdue next_check_date within N days.",
      parameters: {
        type: "object",
        properties: {
          days_ahead: { type: "number", description: "Days ahead to look (default 30)" },
          location_name: { type: "string", description: "Location name filter (optional)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_equipment_intervention_draft",
      description: "Create a draft to log an intervention (check, repair, calibration, etc.) on a piece of equipment.",
      parameters: {
        type: "object",
        properties: {
          equipment_name: { type: "string", description: "Equipment name (partial match)" },
          equipment_id: { type: "string", description: "Equipment UUID (if known)" },
          intervention_type: { type: "string", enum: ["check", "repair", "replacement", "calibration", "cleaning", "other"], description: "Type of intervention" },
          description: { type: "string", description: "Description of the intervention performed" },
          cost: { type: "number", description: "Cost of the intervention (optional)" },
          performed_by: { type: "string", description: "Name of who performed the intervention (optional)" },
          performed_at: { type: "string", description: "ISO timestamp when performed (default: now)" },
          new_status: { type: "string", enum: ["active", "inactive", "maintenance", "retired"], description: "Update equipment status (optional)" },
        },
        required: ["description"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_equipment_intervention",
      description: "Execute an equipment intervention log after user approves the draft.",
      parameters: {
        type: "object",
        properties: {
          pending_action_id: { type: "string", description: "Pending action UUID from log_equipment_intervention_draft" },
        },
        required: ["pending_action_id"],
      },
    },
  },
  // --- QR Forms / Digital Records ---
  {
    type: "function",
    function: {
      name: "list_form_templates",
      description: "List QR form templates (HACCP logs, quality records, event logs) for this company.",
      parameters: {
        type: "object",
        properties: {
          is_active: { type: "boolean", description: "Filter by active status" },
          type: { type: "string", description: "Form type: monthly_grid or event_log" },
          category: { type: "string", description: "Category name filter (partial match)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_form_assignments",
      description: "List QR form assignments — which form templates are assigned to which locations.",
      parameters: {
        type: "object",
        properties: {
          location_name: { type: "string", description: "Filter by location name (partial match)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_form_submissions",
      description: "List submitted QR form records. Filter by location, status, or period (year/month).",
      parameters: {
        type: "object",
        properties: {
          location_name: { type: "string", description: "Location name filter (partial match)" },
          status: { type: "string", description: "Filter by status: draft, submitted, locked" },
          period_year: { type: "number", description: "Filter by year (e.g. 2026)" },
          period_month: { type: "number", description: "Filter by month (1-12)" },
          limit: { type: "number", description: "Max results (default 50)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_form_submission_details",
      description: "Get the full data of a specific QR form submission.",
      parameters: {
        type: "object",
        properties: {
          submission_id: { type: "string", description: "Form submission UUID" },
        },
        required: ["submission_id"],
      },
    },
  },
  // --- WhatsApp Messaging ---
  {
    type: "function",
    function: {
      name: "list_whatsapp_templates",
      description: "List approved WhatsApp message templates for this company.",
      parameters: {
        type: "object",
        properties: {
          approval_status: { type: "string", description: "Filter by approval_status: approved, pending, rejected" },
          category: { type: "string", description: "Template category filter" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_outbound_messages",
      description: "List sent/queued WhatsApp or push messages with delivery status.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Filter by status: queued, sent, failed" },
          channel: { type: "string", description: "Filter by channel: whatsapp, push, email" },
          from: { type: "string", description: "Start date YYYY-MM-DD" },
          to: { type: "string", description: "End date YYYY-MM-DD" },
          limit: { type: "number", description: "Max results (default 50)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_whatsapp_message_draft",
      description: "Create a draft to send a WhatsApp message to one employee or all staff at a location using an approved template.",
      parameters: {
        type: "object",
        properties: {
          template_name: { type: "string", description: "WhatsApp template name (partial match)" },
          template_id: { type: "string", description: "Template UUID (if known)" },
          employee_name: { type: "string", description: "Employee name to send to (partial match). Use either employee_name OR location_name." },
          location_name: { type: "string", description: "Send to all active staff at this location. Use either location_name OR employee_name." },
          variables: { type: "object", description: "Template variable substitutions (optional)" },
          scheduled_for: { type: "string", description: "ISO timestamp to schedule for (optional, default: send immediately)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_send_whatsapp_message",
      description: "Execute a WhatsApp message send after user approves the draft.",
      parameters: {
        type: "object",
        properties: {
          pending_action_id: { type: "string", description: "Pending action UUID from send_whatsapp_message_draft" },
        },
        required: ["pending_action_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_notification_rules",
      description: "List automated notification/alert rules including WhatsApp routing and escalation chains.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_notification_rule_draft",
      description: "Create a draft for an automated notification rule — e.g. when an event occurs, send via a channel to certain roles, with optional escalation.",
      parameters: {
        type: "object",
        properties: {
          event_type: { type: "string", description: "Event trigger name (e.g. audit_score_low, asset_down, shift_unassigned)" },
          channel: { type: "string", description: "Notification channel: whatsapp, push, email" },
          target_roles: { type: "array", items: { type: "string" }, description: "Roles to notify (e.g. [\"manager\", \"admin\"]). Omit for all." },
          throttle_max_per_day: { type: "number", description: "Max notifications per day per recipient (default 20)" },
          escalation_after_minutes: { type: "number", description: "Minutes before escalating if unacknowledged (optional)" },
          escalation_channel: { type: "string", description: "Channel to use for escalation (optional)" },
        },
        required: ["event_type", "channel"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_create_notification_rule",
      description: "Execute creating a notification rule after user approves the draft.",
      parameters: {
        type: "object",
        properties: {
          pending_action_id: { type: "string", description: "Pending action UUID from create_notification_rule_draft" },
        },
        required: ["pending_action_id"],
      },
    },
  },
  // --- Staff Audits ---
  {
    type: "function",
    function: {
      name: "list_staff_audits",
      description: "List staff performance audits/evaluations. Filter by employee, location, or date range.",
      parameters: {
        type: "object",
        properties: {
          employee_name: { type: "string", description: "Employee name filter (partial match)" },
          location_name: { type: "string", description: "Location name filter (partial match)" },
          from: { type: "string", description: "Start date YYYY-MM-DD" },
          to: { type: "string", description: "End date YYYY-MM-DD" },
          limit: { type: "number", description: "Max results (default 50)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_staff_audit_details",
      description: "Get full details of a specific staff audit/performance evaluation.",
      parameters: {
        type: "object",
        properties: {
          audit_id: { type: "string", description: "Staff audit UUID" },
        },
        required: ["audit_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_staff_audit_draft",
      description: "Create a draft for a staff performance audit/evaluation.",
      parameters: {
        type: "object",
        properties: {
          employee_name: { type: "string", description: "Employee to evaluate (partial match)" },
          employee_id: { type: "string", description: "Employee UUID (if known)" },
          location_name: { type: "string", description: "Location name (optional)" },
          template_name: { type: "string", description: "Audit template name (partial match, optional)" },
          audit_date: { type: "string", description: "Evaluation date YYYY-MM-DD (default: today)" },
          score: { type: "number", description: "Score 0-100 (optional, can be filled later)" },
          notes: { type: "string", description: "Evaluation notes (optional)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_staff_audit_creation",
      description: "Execute creating a staff audit after user approves the draft.",
      parameters: {
        type: "object",
        properties: {
          pending_action_id: { type: "string", description: "Pending action UUID from create_staff_audit_draft" },
        },
        required: ["pending_action_id"],
      },
    },
  },
  // --- Scout Payouts ---
  {
    type: "function",
    function: {
      name: "list_scout_payouts",
      description: "List scout payouts. Filter by status (pending/paid/failed) or date range.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Filter by status: pending, paid, failed" },
          from: { type: "string", description: "Start date YYYY-MM-DD" },
          to: { type: "string", description: "End date YYYY-MM-DD" },
          limit: { type: "number", description: "Max results (default 50)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_scout_payout_summary",
      description: "Get a summary of scout payout totals grouped by status (pending/paid/failed).",
      parameters: {
        type: "object",
        properties: {
          from: { type: "string", description: "Start date YYYY-MM-DD (optional)" },
          to: { type: "string", description: "End date YYYY-MM-DD (optional)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "process_scout_payout_draft",
      description: "Create a draft to mark a scout payout as paid or failed.",
      parameters: {
        type: "object",
        properties: {
          payout_id: { type: "string", description: "Scout payout UUID" },
          new_status: { type: "string", enum: ["paid", "failed"], description: "New payout status" },
          notes: { type: "string", description: "Optional notes" },
        },
        required: ["payout_id", "new_status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_process_scout_payout",
      description: "Execute a scout payout status update after user approves the draft.",
      parameters: {
        type: "object",
        properties: {
          pending_action_id: { type: "string", description: "Pending action UUID from process_scout_payout_draft" },
        },
        required: ["pending_action_id"],
      },
    },
  },
  // --- META: Capability discovery ---
  {
    type: "function",
    function: {
      name: "get_capabilities",
      description: "Return the list of things Dash can do for this user — domains, example actions, and active modules. Call this when the user asks 'what can you do?', 'help', 'what features do you have?', or similar.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
];
