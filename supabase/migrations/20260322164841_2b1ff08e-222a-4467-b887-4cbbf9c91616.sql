-- Composite indexes for high-traffic query patterns

-- Attendance logs: filtered by staff + date
CREATE INDEX IF NOT EXISTS idx_attendance_logs_staff_checkin 
  ON attendance_logs(staff_id, check_in_at DESC);

-- Employees: filtered by company + location (soft-delete aware)
CREATE INDEX IF NOT EXISTS idx_employees_company_location 
  ON employees(company_id, location_id);

-- Audits: filtered by company + status + date
CREATE INDEX IF NOT EXISTS idx_audits_company_status 
  ON audits(company_id, status, created_at DESC);

-- Dash action log: analytics queries by company
CREATE INDEX IF NOT EXISTS idx_dash_action_log_company_created 
  ON dash_action_log(company_id, created_at DESC);

-- Dash sessions: user lookup
CREATE INDEX IF NOT EXISTS idx_dash_sessions_user 
  ON dash_sessions(user_id, updated_at DESC);

-- Location audits: filtered by company + status
CREATE INDEX IF NOT EXISTS idx_location_audits_company_status 
  ON location_audits(company_id, status, created_at DESC);