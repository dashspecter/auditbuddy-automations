-- Drop the existing constraint and add one with 'unpaid' included
ALTER TABLE public.time_off_requests 
DROP CONSTRAINT IF EXISTS time_off_requests_request_type_check;

ALTER TABLE public.time_off_requests 
ADD CONSTRAINT time_off_requests_request_type_check 
CHECK (request_type = ANY (ARRAY['vacation', 'sick', 'personal', 'unpaid', 'other']));