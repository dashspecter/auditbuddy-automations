-- Add 'test_submission' to the corrective_actions source_type constraint
ALTER TABLE public.corrective_actions
  DROP CONSTRAINT IF EXISTS corrective_actions_source_type_check;

ALTER TABLE public.corrective_actions
  ADD CONSTRAINT corrective_actions_source_type_check
  CHECK (source_type = ANY (ARRAY[
    'audit_item_result'::text,
    'incident'::text,
    'asset_downtime'::text,
    'manual'::text,
    'test_submission'::text
  ]));