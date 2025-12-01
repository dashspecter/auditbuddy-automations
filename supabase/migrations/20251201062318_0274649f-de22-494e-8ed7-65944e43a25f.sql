-- =====================================================
-- DashSpect 3.0 - Complete RLS Policies
-- Adding comprehensive security policies for all new tables
-- =====================================================

-- =====================================================
-- WORKFORCE MODULE POLICIES
-- =====================================================

-- Time off requests
CREATE POLICY "Staff can view their own time off requests" ON time_off_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM employees WHERE id = staff_id AND company_id = get_user_company_id(auth.uid()))
  );

CREATE POLICY "Staff can create their own time off requests" ON time_off_requests
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM employees WHERE id = staff_id AND company_id = get_user_company_id(auth.uid()))
  );

CREATE POLICY "Managers can manage time off requests" ON time_off_requests
  FOR ALL USING (
    company_id = get_user_company_id(auth.uid()) AND
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  );

-- Payroll periods
CREATE POLICY "Managers can view payroll periods" ON payroll_periods
  FOR SELECT USING (
    company_id = get_user_company_id(auth.uid()) AND
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  );

CREATE POLICY "Managers can manage payroll periods" ON payroll_periods
  FOR ALL USING (
    company_id = get_user_company_id(auth.uid()) AND
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  )
  WITH CHECK (
    company_id = get_user_company_id(auth.uid()) AND
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  );

-- Payroll items
CREATE POLICY "Managers can view payroll items" ON payroll_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM payroll_periods pp 
      WHERE pp.id = period_id 
      AND pp.company_id = get_user_company_id(auth.uid())
      AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
    )
  );

CREATE POLICY "Managers can manage payroll items" ON payroll_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM payroll_periods pp 
      WHERE pp.id = period_id 
      AND pp.company_id = get_user_company_id(auth.uid())
      AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
    )
  );

-- Staff performance scores
CREATE POLICY "Managers can view performance scores" ON staff_performance_scores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = staff_id
      AND e.company_id = get_user_company_id(auth.uid())
      AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
    )
  );

CREATE POLICY "Managers can create performance scores" ON staff_performance_scores
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = staff_id
      AND e.company_id = get_user_company_id(auth.uid())
      AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
    )
  );

-- Staff events
CREATE POLICY "Managers can view staff events" ON staff_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = staff_id
      AND e.company_id = get_user_company_id(auth.uid())
      AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
    )
  );

CREATE POLICY "Managers can create staff events" ON staff_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = staff_id
      AND e.company_id = get_user_company_id(auth.uid())
      AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
    )
  );

-- Attendance logs
CREATE POLICY "Users can view attendance in their company" ON attendance_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = staff_id
      AND e.company_id = get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "Users can create attendance logs" ON attendance_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = staff_id
      AND e.company_id = get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "Managers can manage attendance" ON attendance_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = staff_id
      AND e.company_id = get_user_company_id(auth.uid())
      AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
    )
  );

-- Shift assignments
CREATE POLICY "Staff can view their assignments" ON shift_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = staff_id
      AND e.company_id = get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "Managers can manage shift assignments" ON shift_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM shifts s
      WHERE s.id = shift_id
      AND s.company_id = get_user_company_id(auth.uid())
      AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
    )
  );

-- =====================================================
-- TASKS MODULE POLICIES
-- =====================================================

-- Task templates
CREATE POLICY "Users can view task templates in their company" ON task_templates
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Managers can manage task templates" ON task_templates
  FOR ALL USING (
    company_id = get_user_company_id(auth.uid()) AND
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  );

-- Task photos
CREATE POLICY "Users can view task photos" ON task_photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_id
      AND t.company_id = get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "Users can add photos to tasks" ON task_photos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_id
      AND t.company_id = get_user_company_id(auth.uid())
      AND (t.assigned_to = auth.uid() OR t.created_by = auth.uid())
    )
  );

CREATE POLICY "Managers can manage task photos" ON task_photos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_id
      AND t.company_id = get_user_company_id(auth.uid())
      AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
    )
  );

-- Task comments
CREATE POLICY "Users can view task comments" ON task_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_id
      AND t.company_id = get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "Users can add comments to tasks" ON task_comments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_id
      AND t.company_id = get_user_company_id(auth.uid())
    ) AND auth.uid() = created_by
  );

-- =====================================================
-- INVENTORY MODULE POLICIES
-- =====================================================

-- Inventory snapshots
CREATE POLICY "Users can view snapshots in their company" ON inventory_snapshots
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Managers can manage snapshots" ON inventory_snapshots
  FOR ALL USING (
    company_id = get_user_company_id(auth.uid()) AND
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  );

-- Inventory snapshot lines
CREATE POLICY "Users can view snapshot lines" ON inventory_snapshot_lines
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM inventory_snapshots s
      WHERE s.id = snapshot_id
      AND s.company_id = get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "Managers can manage snapshot lines" ON inventory_snapshot_lines
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM inventory_snapshots s
      WHERE s.id = snapshot_id
      AND s.company_id = get_user_company_id(auth.uid())
      AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
    )
  );

-- Suppliers
CREATE POLICY "Users can view suppliers in their company" ON suppliers
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Managers can manage suppliers" ON suppliers
  FOR ALL USING (
    company_id = get_user_company_id(auth.uid()) AND
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  );

-- Invoices
CREATE POLICY "Users can view invoices in their company" ON invoices
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Managers can manage invoices" ON invoices
  FOR ALL USING (
    company_id = get_user_company_id(auth.uid()) AND
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  );

-- Invoice lines
CREATE POLICY "Users can view invoice lines" ON invoice_lines
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM invoices i
      WHERE i.id = invoice_id
      AND i.company_id = get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "Managers can manage invoice lines" ON invoice_lines
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM invoices i
      WHERE i.id = invoice_id
      AND i.company_id = get_user_company_id(auth.uid())
      AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
    )
  );

-- =====================================================
-- TRAINING MODULE POLICIES
-- =====================================================

-- Document reads
CREATE POLICY "Users can view document reads in their company" ON document_reads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_id
      AND d.company_id = get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "Users can record their document reads" ON document_reads
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_id
      AND d.company_id = get_user_company_id(auth.uid())
    )
  );

-- Training steps
CREATE POLICY "Users can view training steps" ON training_steps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM training_programs tp
      WHERE tp.id = program_id
      AND tp.company_id = get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "Managers can manage training steps" ON training_steps
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM training_programs tp
      WHERE tp.id = program_id
      AND tp.company_id = get_user_company_id(auth.uid())
      AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
    )
  );

-- Training progress
CREATE POLICY "Users can view training progress in their company" ON training_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM training_programs tp
      WHERE tp.id = program_id
      AND tp.company_id = get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "Managers can manage training progress" ON training_progress
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM training_programs tp
      WHERE tp.id = program_id
      AND tp.company_id = get_user_company_id(auth.uid())
      AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
    )
  );

-- Training step completions
CREATE POLICY "Users can view step completions" ON training_step_completions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM training_progress tp
      JOIN training_programs prog ON prog.id = tp.program_id
      WHERE tp.id = progress_id
      AND prog.company_id = get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "Users can record step completions" ON training_step_completions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM training_progress tp
      JOIN training_programs prog ON prog.id = tp.program_id
      WHERE tp.id = progress_id
      AND prog.company_id = get_user_company_id(auth.uid())
    )
  );

-- =====================================================
-- INSIGHTS MODULE POLICIES
-- =====================================================

-- Alerts (create policy)
CREATE POLICY "Managers can create alerts" ON alerts
  FOR INSERT WITH CHECK (
    company_id = get_user_company_id(auth.uid()) AND
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  );

CREATE POLICY "Managers can update alerts" ON alerts
  FOR UPDATE USING (
    company_id = get_user_company_id(auth.uid()) AND
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  );

-- Insight summaries (create policy)
CREATE POLICY "System can create insight summaries" ON insight_summaries
  FOR INSERT WITH CHECK (company_id = get_user_company_id(auth.uid()));

-- =====================================================
-- INTEGRATIONS MODULE POLICIES
-- =====================================================

-- Integration settings
CREATE POLICY "Admins can view integration settings" ON integration_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM integrations i
      WHERE i.id = integration_id
      AND i.company_id = get_user_company_id(auth.uid())
      AND (has_role(auth.uid(), 'admin'::app_role) OR has_company_role(auth.uid(), 'company_admin'))
    )
  );

CREATE POLICY "Admins can manage integration settings" ON integration_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM integrations i
      WHERE i.id = integration_id
      AND i.company_id = get_user_company_id(auth.uid())
      AND (has_role(auth.uid(), 'admin'::app_role) OR has_company_role(auth.uid(), 'company_admin'))
    )
  );

-- Webhook logs
CREATE POLICY "Admins can view webhook logs" ON webhook_logs
  FOR SELECT USING (
    integration_id IS NULL OR
    EXISTS (
      SELECT 1 FROM integrations i
      WHERE i.id = integration_id
      AND i.company_id = get_user_company_id(auth.uid())
      AND (has_role(auth.uid(), 'admin'::app_role) OR has_company_role(auth.uid(), 'company_admin'))
    )
  );

CREATE POLICY "System can create webhook logs" ON webhook_logs
  FOR INSERT WITH CHECK (true); -- Allow system to log webhooks

-- =====================================================
-- STAFF LOCATIONS POLICIES
-- =====================================================

CREATE POLICY "Managers can manage staff locations" ON staff_locations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = staff_id
      AND e.company_id = get_user_company_id(auth.uid())
      AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
    )
  );