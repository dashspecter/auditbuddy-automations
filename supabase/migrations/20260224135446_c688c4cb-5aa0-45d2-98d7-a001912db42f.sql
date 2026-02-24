
CREATE OR REPLACE FUNCTION public.sync_shift_publish_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- On INSERT: sync based on whichever field is set
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_published = true AND (NEW.status IS NULL OR NEW.status = 'draft') THEN
      NEW.status := 'published';
    ELSIF NEW.status = 'published' AND (NEW.is_published IS NULL OR NEW.is_published = false) THEN
      NEW.is_published := true;
    ELSIF (NEW.is_published IS NULL OR NEW.is_published = false) AND (NEW.status IS NULL OR NEW.status = 'draft') THEN
      NEW.status := 'draft';
      NEW.is_published := false;
    END IF;
    RETURN NEW;
  END IF;

  -- On UPDATE: detect which field changed and sync the other
  -- Skip sync for cancelled/deleted statuses (those have their own lifecycle)
  IF NEW.status IN ('cancelled', 'deleted') THEN
    RETURN NEW;
  END IF;

  IF OLD.is_published IS DISTINCT FROM NEW.is_published THEN
    IF NEW.is_published = true THEN
      NEW.status := 'published';
    ELSE
      NEW.status := 'draft';
    END IF;
  ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'published' THEN
      NEW.is_published := true;
    ELSIF NEW.status = 'draft' THEN
      NEW.is_published := false;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_shift_publish_status
  BEFORE INSERT OR UPDATE ON public.shifts
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_shift_publish_status();
