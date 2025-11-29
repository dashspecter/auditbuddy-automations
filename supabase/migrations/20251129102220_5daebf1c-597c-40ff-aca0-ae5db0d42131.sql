-- Make category_id nullable for documents that don't need categories (permits/contracts)
ALTER TABLE public.documents 
ALTER COLUMN category_id DROP NOT NULL;