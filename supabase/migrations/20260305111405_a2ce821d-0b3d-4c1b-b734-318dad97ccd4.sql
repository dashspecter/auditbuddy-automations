-- Step 1: Revert has_role()
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

-- ---- audit_templates ----
DROP POLICY IF EXISTS "Admins can manage templates" ON audit_templates;
DROP POLICY IF EXISTS "Managers can manage templates" ON audit_templates;
CREATE POLICY "Managers can manage templates" ON audit_templates FOR ALL
USING (company_id = get_user_company_id(auth.uid()) AND (has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin') OR has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin')))
WITH CHECK (company_id = get_user_company_id(auth.uid()) AND (has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin') OR has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin')));

DROP POLICY IF EXISTS "Users can view active templates in their company" ON audit_templates;
CREATE POLICY "Users can view active templates in their company" ON audit_templates FOR SELECT
USING (is_active = true AND company_id = get_user_company_id(auth.uid()));

-- ---- audit_sections / audit_fields (remove unscoped admin-only) ----
DROP POLICY IF EXISTS "Admins can manage sections" ON audit_sections;
DROP POLICY IF EXISTS "Admins can manage fields" ON audit_fields;

-- ---- location_audits ----
DROP POLICY IF EXISTS "Admins can delete location audits" ON location_audits;
DROP POLICY IF EXISTS "Admins can update all location audits" ON location_audits;
DROP POLICY IF EXISTS "Managers can delete location audits" ON location_audits;
DROP POLICY IF EXISTS "Managers can update all location audits" ON location_audits;
DROP POLICY IF EXISTS "Users can view audits based on role" ON location_audits;

CREATE POLICY "Managers can update location audits" ON location_audits FOR UPDATE
USING (EXISTS (SELECT 1 FROM locations l WHERE l.id = location_audits.location_id AND l.company_id = get_user_company_id(auth.uid()))
  AND (auth.uid() = location_audits.user_id OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin') OR has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin')));

CREATE POLICY "Managers can delete location audits" ON location_audits FOR DELETE
USING (EXISTS (SELECT 1 FROM locations l WHERE l.id = location_audits.location_id AND l.company_id = get_user_company_id(auth.uid()))
  AND (has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin') OR has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin')));

CREATE POLICY "Users can view audits based on role" ON location_audits FOR SELECT
USING (EXISTS (SELECT 1 FROM locations l WHERE l.id = location_audits.location_id AND l.company_id = get_user_company_id(auth.uid()))
  AND (auth.uid() = location_audits.user_id OR auth.uid() = location_audits.assigned_user_id
    OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'checker')
    OR has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin')));

-- ---- staff_audits ----
DROP POLICY IF EXISTS "Admins can delete staff audits" ON staff_audits;
DROP POLICY IF EXISTS "Managers can update all staff audits" ON staff_audits;
DROP POLICY IF EXISTS "Users can view audits based on role" ON staff_audits;

CREATE POLICY "Managers can update staff audits" ON staff_audits FOR UPDATE
USING (company_id = get_user_company_id(auth.uid()) AND (has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin') OR has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin')));

CREATE POLICY "Managers can delete staff audits" ON staff_audits FOR DELETE
USING (company_id = get_user_company_id(auth.uid()) AND (has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin') OR has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin')));

CREATE POLICY "Users can view staff audits" ON staff_audits FOR SELECT
USING (company_id = get_user_company_id(auth.uid()) AND (auth.uid() = staff_audits.auditor_id OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin') OR has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin')));

-- ---- audit_field_responses ----
DROP POLICY IF EXISTS "Admins and managers can update responses" ON audit_field_responses;
CREATE POLICY "Managers can update responses in company" ON audit_field_responses FOR UPDATE
USING (EXISTS (SELECT 1 FROM location_audits la JOIN locations l ON l.id = la.location_id WHERE la.id = audit_field_responses.audit_id AND l.company_id = get_user_company_id(auth.uid()))
  AND (has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin') OR has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin')));

DROP POLICY IF EXISTS "Users can view responses for accessible audits" ON audit_field_responses;
CREATE POLICY "Users can view responses for accessible audits" ON audit_field_responses FOR SELECT
USING (EXISTS (SELECT 1 FROM location_audits la JOIN locations l ON l.id = la.location_id WHERE la.id = audit_field_responses.audit_id AND l.company_id = get_user_company_id(auth.uid())
  AND (la.user_id = auth.uid() OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'checker') OR has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin'))));

-- ---- audit_section_responses ----
DROP POLICY IF EXISTS "Admins and managers can update section responses" ON audit_section_responses;
CREATE POLICY "Managers can update section responses in company" ON audit_section_responses FOR UPDATE
USING (EXISTS (SELECT 1 FROM location_audits la JOIN locations l ON l.id = la.location_id WHERE la.id = audit_section_responses.audit_id AND l.company_id = get_user_company_id(auth.uid()))
  AND (has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin') OR has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin')));

DROP POLICY IF EXISTS "Users can view section responses for accessible audits" ON audit_section_responses;
CREATE POLICY "Users can view section responses for accessible audits" ON audit_section_responses FOR SELECT
USING (EXISTS (SELECT 1 FROM location_audits la JOIN locations l ON l.id = la.location_id WHERE la.id = audit_section_responses.audit_id AND l.company_id = get_user_company_id(auth.uid())
  AND (la.user_id = auth.uid() OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'checker') OR has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin'))));

-- ---- audit_photos ----
DROP POLICY IF EXISTS "Admins and managers can delete photos" ON audit_photos;
DROP POLICY IF EXISTS "Users can view photos for accessible audits" ON audit_photos;

CREATE POLICY "Managers can delete audit photos" ON audit_photos FOR DELETE
USING (EXISTS (SELECT 1 FROM location_audits la JOIN locations l ON l.id = la.location_id WHERE la.id = audit_photos.audit_id AND l.company_id = get_user_company_id(auth.uid()))
  AND (has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin') OR has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin')));

CREATE POLICY "Users can view audit photos in company" ON audit_photos FOR SELECT
USING (EXISTS (SELECT 1 FROM location_audits la JOIN locations l ON l.id = la.location_id WHERE la.id = audit_photos.audit_id AND l.company_id = get_user_company_id(auth.uid())
  AND (la.user_id = auth.uid() OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'checker') OR has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin'))));

-- ---- audit_revisions ----
DROP POLICY IF EXISTS "Users can view revisions for accessible audits" ON audit_revisions;
CREATE POLICY "Users can view revisions in company" ON audit_revisions FOR SELECT
USING (EXISTS (SELECT 1 FROM location_audits la JOIN locations l ON l.id = la.location_id WHERE la.id = audit_revisions.audit_id AND l.company_id = get_user_company_id(auth.uid())
  AND (la.user_id = auth.uid() OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin') OR has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin'))));

-- ---- audit_field_attachments ----
DROP POLICY IF EXISTS "Admins and managers can delete attachments" ON audit_field_attachments;
DROP POLICY IF EXISTS "Users can view attachments for accessible responses" ON audit_field_attachments;

CREATE POLICY "Managers can delete attachments in company" ON audit_field_attachments FOR DELETE
USING (EXISTS (SELECT 1 FROM audit_field_responses afr JOIN location_audits la ON la.id = afr.audit_id JOIN locations l ON l.id = la.location_id WHERE afr.id = audit_field_attachments.field_response_id AND l.company_id = get_user_company_id(auth.uid()))
  AND (has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin') OR has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin')));

CREATE POLICY "Users can view attachments in company" ON audit_field_attachments FOR SELECT
USING (EXISTS (SELECT 1 FROM audit_field_responses afr JOIN location_audits la ON la.id = afr.audit_id JOIN locations l ON l.id = la.location_id WHERE afr.id = audit_field_attachments.field_response_id AND l.company_id = get_user_company_id(auth.uid())
  AND (la.user_id = auth.uid() OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin') OR has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin'))));

-- ---- audit_field_photos ----
DROP POLICY IF EXISTS "Admins and managers can delete photos" ON audit_field_photos;
DROP POLICY IF EXISTS "Users can view photos for accessible responses" ON audit_field_photos;

CREATE POLICY "Managers can delete field photos in company" ON audit_field_photos FOR DELETE
USING (EXISTS (SELECT 1 FROM audit_field_responses afr JOIN location_audits la ON la.id = afr.audit_id JOIN locations l ON l.id = la.location_id WHERE afr.id = audit_field_photos.field_response_id AND l.company_id = get_user_company_id(auth.uid()))
  AND (has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin') OR has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin')));

CREATE POLICY "Users can view field photos in company" ON audit_field_photos FOR SELECT
USING (EXISTS (SELECT 1 FROM audit_field_responses afr JOIN location_audits la ON la.id = afr.audit_id JOIN locations l ON l.id = la.location_id WHERE afr.id = audit_field_photos.field_response_id AND l.company_id = get_user_company_id(auth.uid())
  AND (la.user_id = auth.uid() OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin') OR has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin'))));

-- ---- locations ----
DROP POLICY IF EXISTS "Admins and managers can delete locations" ON locations;
DROP POLICY IF EXISTS "Admins and managers can insert locations" ON locations;
DROP POLICY IF EXISTS "Admins, managers, and company owners can update locations" ON locations;

CREATE POLICY "Managers can delete locations in company" ON locations FOR DELETE
USING (company_id = get_user_company_id(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin')));

CREATE POLICY "Managers can insert locations in company" ON locations FOR INSERT
WITH CHECK (company_id = get_user_company_id(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin')));

CREATE POLICY "Managers can update locations in company" ON locations FOR UPDATE
USING (company_id = get_user_company_id(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin')));

-- ---- manual_metrics ----
DROP POLICY IF EXISTS "Admins and managers can view all metrics" ON manual_metrics;
DROP POLICY IF EXISTS "Admins and managers can update metrics" ON manual_metrics;
DROP POLICY IF EXISTS "Admins and managers can create metrics" ON manual_metrics;
DROP POLICY IF EXISTS "Admins can delete metrics" ON manual_metrics;

CREATE POLICY "Managers can view metrics in company" ON manual_metrics FOR SELECT
USING (company_id = get_user_company_id(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin')));

CREATE POLICY "Managers can update metrics in company" ON manual_metrics FOR UPDATE
USING (company_id = get_user_company_id(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin')));

CREATE POLICY "Managers can create metrics in company" ON manual_metrics FOR INSERT
WITH CHECK (company_id = get_user_company_id(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin')) AND auth.uid() = created_by);

CREATE POLICY "Managers can delete metrics in company" ON manual_metrics FOR DELETE
USING (company_id = get_user_company_id(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin')));

-- ---- recurring_audit_schedules (join via locations) ----
DROP POLICY IF EXISTS "Admins and managers can view recurring schedules" ON recurring_audit_schedules;
DROP POLICY IF EXISTS "Admins and managers can update recurring schedules" ON recurring_audit_schedules;
DROP POLICY IF EXISTS "Admins and managers can create recurring schedules" ON recurring_audit_schedules;
DROP POLICY IF EXISTS "Admins can delete recurring schedules" ON recurring_audit_schedules;

CREATE POLICY "Managers can view recurring schedules" ON recurring_audit_schedules FOR SELECT
USING (EXISTS (SELECT 1 FROM locations l WHERE l.id = recurring_audit_schedules.location_id AND l.company_id = get_user_company_id(auth.uid()))
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin')));

CREATE POLICY "Managers can update recurring schedules" ON recurring_audit_schedules FOR UPDATE
USING (EXISTS (SELECT 1 FROM locations l WHERE l.id = recurring_audit_schedules.location_id AND l.company_id = get_user_company_id(auth.uid()))
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin')));

CREATE POLICY "Managers can create recurring schedules" ON recurring_audit_schedules FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM locations l WHERE l.id = recurring_audit_schedules.location_id AND l.company_id = get_user_company_id(auth.uid()))
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin'))
  AND auth.uid() = created_by);

CREATE POLICY "Managers can delete recurring schedules" ON recurring_audit_schedules FOR DELETE
USING (EXISTS (SELECT 1 FROM locations l WHERE l.id = recurring_audit_schedules.location_id AND l.company_id = get_user_company_id(auth.uid()))
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin')));

-- ---- notifications (no user_id column) ----
DROP POLICY IF EXISTS "Admins can view all notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can update all notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can delete all notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Managers can create notifications for checkers" ON notifications;

CREATE POLICY "Managers can view notifications in company" ON notifications FOR SELECT
USING (company_id = get_user_company_id(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin')));

CREATE POLICY "Managers can update notifications in company" ON notifications FOR UPDATE
USING (company_id = get_user_company_id(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin')));

CREATE POLICY "Managers can delete notifications in company" ON notifications FOR DELETE
USING (company_id = get_user_company_id(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin')));

CREATE POLICY "Managers can insert notifications in company" ON notifications FOR INSERT
WITH CHECK (company_id = get_user_company_id(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin')));

-- ---- employee_warning_views (join via employees) ----
DROP POLICY IF EXISTS "Admins managers can view all warning views" ON employee_warning_views;
CREATE POLICY "Managers can view warning views in company" ON employee_warning_views FOR SELECT
USING (EXISTS (SELECT 1 FROM employees e WHERE e.id = employee_warning_views.employee_id AND e.company_id = get_user_company_id(auth.uid()))
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin')));

-- ---- equipment_documents ----
DROP POLICY IF EXISTS "Admins and managers can manage documents" ON equipment_documents;
CREATE POLICY "Managers can manage equipment documents in company" ON equipment_documents FOR ALL
USING (EXISTS (SELECT 1 FROM equipment e WHERE e.id = equipment_documents.equipment_id AND e.company_id = get_user_company_id(auth.uid()))
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin')))
WITH CHECK (EXISTS (SELECT 1 FROM equipment e WHERE e.id = equipment_documents.equipment_id AND e.company_id = get_user_company_id(auth.uid()))
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin')));

-- ---- equipment_status_history ----
DROP POLICY IF EXISTS "Admins and managers can view status history" ON equipment_status_history;
DROP POLICY IF EXISTS "Checkers can view status history" ON equipment_status_history;
DROP POLICY IF EXISTS "Users can view status history in their company" ON equipment_status_history;

CREATE POLICY "Users can view status history in company" ON equipment_status_history FOR SELECT
USING (EXISTS (SELECT 1 FROM equipment e WHERE e.id = equipment_status_history.equipment_id AND e.company_id = get_user_company_id(auth.uid())));

-- ---- recurring_maintenance_schedules ----
DROP POLICY IF EXISTS "Admins and managers can manage recurring schedules" ON recurring_maintenance_schedules;
DROP POLICY IF EXISTS "Users can view schedules for their assigned equipment" ON recurring_maintenance_schedules;

CREATE POLICY "Managers can manage maintenance schedules in company" ON recurring_maintenance_schedules FOR ALL
USING (company_id = get_user_company_id(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin')))
WITH CHECK (company_id = get_user_company_id(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin')));

CREATE POLICY "Users can view their assigned maintenance schedules" ON recurring_maintenance_schedules FOR SELECT
USING (company_id = get_user_company_id(auth.uid()) AND (auth.uid() = assigned_user_id OR auth.uid() = supervisor_user_id));

-- ---- notification_audit_logs (join via notifications) ----
DROP POLICY IF EXISTS "Admins can view all audit logs" ON notification_audit_logs;
DROP POLICY IF EXISTS "Managers can view audit logs" ON notification_audit_logs;

CREATE POLICY "Managers can view notification audit logs in company" ON notification_audit_logs FOR SELECT
USING (EXISTS (SELECT 1 FROM notifications n WHERE n.id = notification_audit_logs.notification_id AND n.company_id = get_user_company_id(auth.uid()))
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin')));

-- ---- notification_templates ----
DROP POLICY IF EXISTS "Admins can manage all templates" ON notification_templates;
DROP POLICY IF EXISTS "Managers can view templates" ON notification_templates;

CREATE POLICY "Managers can manage notification templates in company" ON notification_templates FOR ALL
USING (company_id = get_user_company_id(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin')))
WITH CHECK (company_id = get_user_company_id(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin')));

-- ---- template_locations ----
DROP POLICY IF EXISTS "Admins and managers can manage template locations" ON template_locations;
DROP POLICY IF EXISTS "Checkers can view template locations" ON template_locations;

CREATE POLICY "Managers can manage template locations in company" ON template_locations FOR ALL
USING (EXISTS (SELECT 1 FROM audit_templates t WHERE t.id = template_locations.template_id AND t.company_id = get_user_company_id(auth.uid()))
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin')))
WITH CHECK (EXISTS (SELECT 1 FROM audit_templates t WHERE t.id = template_locations.template_id AND t.company_id = get_user_company_id(auth.uid()))
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin')));

CREATE POLICY "Users can view template locations in company" ON template_locations FOR SELECT
USING (EXISTS (SELECT 1 FROM audit_templates t WHERE t.id = template_locations.template_id AND t.company_id = get_user_company_id(auth.uid())));

-- ---- profiles ----
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Managers can view all profiles" ON profiles;

CREATE POLICY "Managers can view profiles in company" ON profiles FOR SELECT
USING (EXISTS (SELECT 1 FROM company_users cu WHERE cu.user_id = profiles.id AND cu.company_id = get_user_company_id(auth.uid()))
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin')));

-- ---- test_assignments ----
DROP POLICY IF EXISTS "Admins and managers can manage test assignments" ON test_assignments;
DROP POLICY IF EXISTS "Employees can update their own assignments" ON test_assignments;
DROP POLICY IF EXISTS "Employees can view their own assignments" ON test_assignments;

CREATE POLICY "Managers can manage test assignments in company" ON test_assignments FOR ALL
USING (EXISTS (SELECT 1 FROM employees e WHERE e.id = test_assignments.employee_id AND e.company_id = get_user_company_id(auth.uid()))
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin')))
WITH CHECK (EXISTS (SELECT 1 FROM employees e WHERE e.id = test_assignments.employee_id AND e.company_id = get_user_company_id(auth.uid()))
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin')));

CREATE POLICY "Employees can view own assignments" ON test_assignments FOR SELECT
USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

CREATE POLICY "Employees can update own assignments" ON test_assignments FOR UPDATE
USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

-- ---- test_questions ----
DROP POLICY IF EXISTS "Admins and managers can manage questions" ON test_questions;

CREATE POLICY "Managers can manage test questions in company" ON test_questions FOR ALL
USING (EXISTS (SELECT 1 FROM tests t WHERE t.id = test_questions.test_id AND t.company_id = get_user_company_id(auth.uid()))
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin')))
WITH CHECK (EXISTS (SELECT 1 FROM tests t WHERE t.id = test_questions.test_id AND t.company_id = get_user_company_id(auth.uid()))
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin')));

-- ---- test_submissions ----
DROP POLICY IF EXISTS "Employees can submit their own tests" ON test_submissions;
DROP POLICY IF EXISTS "Employees can update their own submissions" ON test_submissions;
DROP POLICY IF EXISTS "Employees can view their own submissions" ON test_submissions;
DROP POLICY IF EXISTS "Users can view test submissions for accessible employees" ON test_submissions;

CREATE POLICY "Employees can submit own tests" ON test_submissions FOR INSERT
WITH CHECK (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

CREATE POLICY "Employees can update own submissions" ON test_submissions FOR UPDATE
USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

CREATE POLICY "Employees can view own submissions" ON test_submissions FOR SELECT
USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

CREATE POLICY "Managers can view test submissions in company" ON test_submissions FOR SELECT
USING (EXISTS (SELECT 1 FROM employees e WHERE e.id = test_submissions.employee_id AND e.company_id = get_user_company_id(auth.uid()))
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin')));

CREATE POLICY "Managers can update test submissions in company" ON test_submissions FOR UPDATE
USING (EXISTS (SELECT 1 FROM employees e WHERE e.id = test_submissions.employee_id AND e.company_id = get_user_company_id(auth.uid()))
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin')));