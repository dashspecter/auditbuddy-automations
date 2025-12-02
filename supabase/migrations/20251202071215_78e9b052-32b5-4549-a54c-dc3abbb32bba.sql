
-- Create table for shift swap requests
CREATE TABLE IF NOT EXISTS shift_swap_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_assignment_id UUID NOT NULL REFERENCES shift_assignments(id) ON DELETE CASCADE,
  target_staff_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  target_assignment_id UUID REFERENCES shift_assignments(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'cancelled')),
  requester_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE shift_swap_requests ENABLE ROW LEVEL SECURITY;

-- Employees can view swap requests involving them
CREATE POLICY "Employees can view their swap requests"
ON shift_swap_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM shift_assignments sa
    JOIN employees e ON e.id = sa.staff_id
    WHERE sa.id IN (requester_assignment_id, target_assignment_id)
    AND e.user_id = auth.uid()
  )
);

-- Employees can create swap requests
CREATE POLICY "Employees can create swap requests"
ON shift_swap_requests
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM shift_assignments sa
    JOIN employees e ON e.id = sa.staff_id
    WHERE sa.id = requester_assignment_id
    AND e.user_id = auth.uid()
  )
);

-- Employees can update swap requests they're involved in
CREATE POLICY "Employees can update their swap requests"
ON shift_swap_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM shift_assignments sa
    JOIN employees e ON e.id = sa.staff_id
    WHERE sa.id IN (requester_assignment_id, target_assignment_id)
    AND e.user_id = auth.uid()
  )
);

-- Managers can view all swap requests in their company
CREATE POLICY "Managers can view company swap requests"
ON shift_swap_requests
FOR SELECT
USING (
  company_id = get_user_company_id(auth.uid())
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
);

-- Create index for performance
CREATE INDEX idx_shift_swap_requests_requester ON shift_swap_requests(requester_assignment_id);
CREATE INDEX idx_shift_swap_requests_target ON shift_swap_requests(target_assignment_id);
CREATE INDEX idx_shift_swap_requests_company ON shift_swap_requests(company_id);
CREATE INDEX idx_shift_swap_requests_status ON shift_swap_requests(status);
