
DROP POLICY IF EXISTS "Public can view active templates by token" ON mystery_shopper_templates;

CREATE POLICY "Anon can view active templates by token"
ON mystery_shopper_templates FOR SELECT TO anon
USING (is_active = true);
