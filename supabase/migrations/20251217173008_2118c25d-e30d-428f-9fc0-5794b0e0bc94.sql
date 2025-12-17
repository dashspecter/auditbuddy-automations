-- Drop the existing constraint
ALTER TABLE public.audit_fields DROP CONSTRAINT IF EXISTS audit_fields_field_type_check;

-- Add new constraint with all supported field types
ALTER TABLE public.audit_fields ADD CONSTRAINT audit_fields_field_type_check 
CHECK (field_type = ANY (ARRAY[
  'rating'::text, 
  'yesno'::text, 
  'checkbox'::text,
  'text'::text, 
  'textarea'::text,
  'number'::text, 
  'date'::text,
  'time'::text,
  'select'::text,
  'multiselect'::text,
  'photo'::text
]));