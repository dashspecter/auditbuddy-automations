
-- 1. audit_field_responses INSERT: allow assigned users
DROP POLICY "Users can create responses for their audits" ON audit_field_responses;
CREATE POLICY "Users can create responses for their audits"
ON audit_field_responses FOR INSERT
WITH CHECK (
  auth.uid() = created_by
  AND EXISTS (
    SELECT 1 FROM location_audits
    WHERE location_audits.id = audit_field_responses.audit_id
    AND (location_audits.user_id = auth.uid() OR location_audits.assigned_user_id = auth.uid())
  )
);

-- 2. audit_field_responses UPDATE (own): allow assigned users
DROP POLICY "Users can update their own responses" ON audit_field_responses;
CREATE POLICY "Users can update their own responses"
ON audit_field_responses FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM location_audits
    WHERE location_audits.id = audit_field_responses.audit_id
    AND (location_audits.user_id = auth.uid() OR location_audits.assigned_user_id = auth.uid())
  )
);

-- 3. audit_section_responses INSERT: allow assigned users
DROP POLICY "Users can create section responses for their audits" ON audit_section_responses;
CREATE POLICY "Users can create section responses for their audits"
ON audit_section_responses FOR INSERT
WITH CHECK (
  auth.uid() = created_by
  AND EXISTS (
    SELECT 1 FROM location_audits
    WHERE location_audits.id = audit_section_responses.audit_id
    AND (location_audits.user_id = auth.uid() OR location_audits.assigned_user_id = auth.uid())
  )
);

-- 4. audit_section_responses UPDATE (own): allow assigned users
DROP POLICY "Users can update their own section responses" ON audit_section_responses;
CREATE POLICY "Users can update their own section responses"
ON audit_section_responses FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM location_audits
    WHERE location_audits.id = audit_section_responses.audit_id
    AND (location_audits.user_id = auth.uid() OR location_audits.assigned_user_id = auth.uid())
  )
);

-- 5. location_audits UPDATE (own): allow assigned users
DROP POLICY "Users can update their own location audits" ON location_audits;
CREATE POLICY "Users can update their own location audits"
ON location_audits FOR UPDATE
USING (
  auth.uid() = user_id OR auth.uid() = assigned_user_id
);
