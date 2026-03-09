ALTER TABLE public.workforce_exceptions
  DROP CONSTRAINT workforce_exceptions_exception_type_check;

ALTER TABLE public.workforce_exceptions
  ADD CONSTRAINT workforce_exceptions_exception_type_check
  CHECK (exception_type IN (
    'late_start', 'early_leave', 'unscheduled_shift',
    'no_show', 'shift_extended', 'overtime', 'absence'
  ));