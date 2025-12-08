-- Drop the old constraint and add new one with contract_template
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_document_type_check;

ALTER TABLE public.documents ADD CONSTRAINT documents_document_type_check 
CHECK (document_type = ANY (ARRAY['knowledge', 'permit', 'contract', 'contract_template']));