ALTER TABLE shifts DISABLE TRIGGER validate_shift_times;

UPDATE shifts SET is_published = false WHERE status = 'draft' AND is_published = true;

ALTER TABLE shifts ENABLE TRIGGER validate_shift_times;