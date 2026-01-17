-- Restore any audits incorrectly marked as discarded but actually completed
-- (overall_score is set and positive, indicating they were submitted)
UPDATE public.location_audits
SET status = 'completed'
WHERE status = 'discarded'
  AND overall_score IS NOT NULL
  AND overall_score > 0;