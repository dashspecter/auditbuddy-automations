
-- Step 1: Drop and recreate the check constraint to allow 'open' status
ALTER TABLE public.shifts DROP CONSTRAINT IF EXISTS shifts_status_check;
ALTER TABLE public.shifts ADD CONSTRAINT shifts_status_check CHECK (status IN ('draft', 'published', 'cancelled', 'open', 'deleted'));

-- Step 2: Now migrate existing is_open_shift=true rows to status='open'
UPDATE public.shifts 
SET status = 'open' 
WHERE is_open_shift = true 
  AND is_published = true 
  AND status = 'published';
