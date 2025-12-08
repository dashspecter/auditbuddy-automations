-- Add missing contract placeholder fields to employees table
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS domiciliu text,
ADD COLUMN IF NOT EXISTS emisa_de text,
ADD COLUMN IF NOT EXISTS valabila_de_la text,
ADD COLUMN IF NOT EXISTS ocupatia text,
ADD COLUMN IF NOT EXISTS cod_cor text,
ADD COLUMN IF NOT EXISTS valoare_tichet numeric,
ADD COLUMN IF NOT EXISTS perioada_proba_end text;