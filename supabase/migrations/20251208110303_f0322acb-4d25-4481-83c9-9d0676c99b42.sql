-- Add foreign employee fields to employees table
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS is_foreign BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS nr_permis_sedere TEXT,
ADD COLUMN IF NOT EXISTS permis_institutie_emitenta TEXT,
ADD COLUMN IF NOT EXISTS permis_data_eliberare DATE,
ADD COLUMN IF NOT EXISTS permis_data_expirare DATE,
ADD COLUMN IF NOT EXISTS numar_aviz TEXT,
ADD COLUMN IF NOT EXISTS aviz_data_eliberare DATE,
ADD COLUMN IF NOT EXISTS aviz_institutie TEXT,
ADD COLUMN IF NOT EXISTS spor_weekend NUMERIC;