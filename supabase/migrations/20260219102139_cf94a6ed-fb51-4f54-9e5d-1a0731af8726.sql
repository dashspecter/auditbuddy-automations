
-- Change corrective_actions.source_id from UUID to TEXT
-- to support composite dedup keys like "emp:{id}:test:{id}"
ALTER TABLE public.corrective_actions 
  ALTER COLUMN source_id TYPE text USING source_id::text;
