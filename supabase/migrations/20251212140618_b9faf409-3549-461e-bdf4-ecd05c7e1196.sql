-- Add manage_notifications to the company_permission enum
ALTER TYPE public.company_permission ADD VALUE IF NOT EXISTS 'manage_notifications';