-- Issue 1: Lock down platform_audit_log INSERT to service_role only
DROP POLICY IF EXISTS "System can insert audit logs" ON platform_audit_log;
CREATE POLICY "Only service role can insert audit logs"
  ON platform_audit_log FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Issue 2a: Lock down webhook_logs INSERT to service_role only
DROP POLICY IF EXISTS "System can insert webhook logs" ON webhook_logs;
CREATE POLICY "Only service role can insert webhook logs"
  ON webhook_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Issue 2b: Fix webhook_logs SELECT from public to authenticated
DROP POLICY IF EXISTS "Admins can view webhook logs in their company" ON webhook_logs;
CREATE POLICY "Admins can view webhook logs in their company"
  ON webhook_logs FOR SELECT
  TO authenticated
  USING (
    company_id = get_user_company_id(auth.uid())
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_company_role(auth.uid(), 'company_admin')
    )
  );

-- Issue 3: Scope vouchers INSERT for authenticated users to their company
DROP POLICY IF EXISTS "Allow authenticated insert vouchers" ON vouchers;
CREATE POLICY "Authenticated users can insert vouchers for their company"
  ON vouchers FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

-- Issue 4: Scope audit-field-attachments SELECT to user's folder
DROP POLICY IF EXISTS "Users can view audit files" ON storage.objects;
CREATE POLICY "Users can view audit files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'audit-field-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );