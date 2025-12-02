
-- Add notification status column to track if notifications were sent
ALTER TABLE shift_swap_requests 
ADD COLUMN IF NOT EXISTS requires_manager_approval BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS manager_approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS manager_approved_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS manager_notes TEXT,
ADD COLUMN IF NOT EXISTS target_response TEXT CHECK (target_response IN ('pending', 'accepted', 'declined')),
ADD COLUMN IF NOT EXISTS target_responded_at TIMESTAMPTZ;

-- Update status check to include manager approval states
ALTER TABLE shift_swap_requests 
DROP CONSTRAINT IF EXISTS shift_swap_requests_status_check;

ALTER TABLE shift_swap_requests 
ADD CONSTRAINT shift_swap_requests_status_check 
CHECK (status IN ('pending', 'pending_manager_approval', 'manager_approved', 'manager_declined', 'accepted', 'declined', 'cancelled', 'completed'));

-- Create index for manager approval queries
CREATE INDEX IF NOT EXISTS idx_shift_swap_requests_manager_approval 
ON shift_swap_requests(requires_manager_approval, status) 
WHERE requires_manager_approval = true;

COMMENT ON COLUMN shift_swap_requests.requires_manager_approval IS 'True if the swap involves different roles and needs manager approval';
COMMENT ON COLUMN shift_swap_requests.target_response IS 'Response from the target staff member';
