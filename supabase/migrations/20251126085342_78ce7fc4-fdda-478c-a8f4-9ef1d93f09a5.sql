-- Step 1: Add location_id column to location_audits (nullable initially for migration)
ALTER TABLE public.location_audits 
ADD COLUMN location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL;

-- Step 2: Add location_id column to audit_templates (nullable initially)
ALTER TABLE public.audit_templates 
ADD COLUMN location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL;

-- Step 3: Create index for better query performance
CREATE INDEX idx_location_audits_location_id ON public.location_audits(location_id);
CREATE INDEX idx_audit_templates_location_id ON public.audit_templates(location_id);

-- Step 4: Note - Data migration will need to be done manually:
-- Administrators should:
-- 1. Create location records in the locations table for existing location names
-- 2. Update location_audits.location_id to match the corresponding location records
-- 3. Update audit_templates.location_id to match the corresponding location records
-- 4. Once all data is migrated, the old 'location' text column can be made nullable or removed

-- For now, keep both columns to allow gradual migration
-- Old column: location (text)
-- New column: location_id (uuid FK)