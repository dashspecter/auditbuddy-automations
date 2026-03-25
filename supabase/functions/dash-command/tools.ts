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
  // --- READ: Audits ---
  {
    type: "function",
    function: {
      name: "get_audit_results",
      description: "Get recent audit results (scores, templates used, locations) within a date range.",
      parameters: {
        type: "object",
        properties: {
          location_id: { type: "string", description: "Optional location filter" },
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
      description: "Compare audit performance across locations for a date range. If location_ids is omitted, compares ALL active company locations.",
      parameters: {
        type: "object",
        properties: {
          location_ids: { type: "array", items: { type: "string" }, description: "Location UUIDs to compare. If omitted, all active company locations are compared." },
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
      name: "get_attendance_exceptions",
      description: "Get attendance exceptions (late arrivals, missed checkouts, no-shows) for a date range.",
      parameters: {
        type: "object",
        properties: {
          location_id: { type: "string" },
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
      description: "Create a shift draft for user approval before creating. Shows preview of the shift.",
      parameters: {
        type: "object",
        properties: {
          location_name: { type: "string" },
          location_id: { type: "string" },
          role: { type: "string", description: "Role/position for the shift" },
          shift_date: { type: "string", description: "Date YYYY-MM-DD" },
          start_time: { type: "string", description: "Start time HH:MM" },
          end_time: { type: "string", description: "End time HH:MM" },
          min_staff: { type: "number", description: "Minimum staff needed" },
          max_staff: { type: "number", description: "Maximum staff" },
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
      description: "Update an existing shift (change time, date, role, or reassign employee). Creates a draft for approval. Use when user says 'change shift', 'move shift', 'update schedule', 'reschedule'.",
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
];
