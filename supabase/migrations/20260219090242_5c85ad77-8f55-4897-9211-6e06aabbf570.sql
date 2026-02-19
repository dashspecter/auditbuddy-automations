-- Make location_id nullable on corrective_actions so test_fail without location doesn't crash
ALTER TABLE public.corrective_actions ALTER COLUMN location_id DROP NOT NULL;