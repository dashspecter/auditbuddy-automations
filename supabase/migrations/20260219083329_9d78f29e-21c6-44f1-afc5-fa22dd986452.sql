
-- Add 'test_fail' to the trigger_type check constraint
ALTER TABLE public.corrective_action_rules
  DROP CONSTRAINT corrective_action_rules_trigger_type_check;

ALTER TABLE public.corrective_action_rules
  ADD CONSTRAINT corrective_action_rules_trigger_type_check
  CHECK (trigger_type = ANY (ARRAY['audit_fail'::text, 'incident_repeat'::text, 'asset_downtime_pattern'::text, 'test_fail'::text]));
