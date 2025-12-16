-- Add visible_to_roles column to document_categories
ALTER TABLE public.document_categories 
ADD COLUMN visible_to_roles TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Update existing categories to be visible to all roles by default (empty array means visible to all)
COMMENT ON COLUMN public.document_categories.visible_to_roles IS 'Array of employee role names that can see this category. Empty array means visible to all roles.';