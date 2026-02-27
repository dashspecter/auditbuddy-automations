ALTER TABLE public.attendance_kiosks
  ADD COLUMN department_id uuid REFERENCES public.departments(id);