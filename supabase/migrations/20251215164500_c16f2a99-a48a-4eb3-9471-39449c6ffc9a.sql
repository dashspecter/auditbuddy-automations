-- Fix infinite recursion in task_locations RLS policies
-- Drop problematic policies and recreate without circular references

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Users can create task locations for their tasks" ON task_locations;

-- Recreate the insert policy without circular reference
-- Use a simpler check that doesn't cause recursion
CREATE POLICY "Users can create task locations for their tasks" 
ON task_locations 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_locations.task_id
    AND t.created_by = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
);