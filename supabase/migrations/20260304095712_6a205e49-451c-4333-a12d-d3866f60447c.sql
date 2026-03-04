DROP POLICY IF EXISTS "Anyone can view active tests" ON tests;

CREATE POLICY "Anon can view active tests by link"
ON tests FOR SELECT TO anon
USING (is_active = true);