
CREATE OR REPLACE FUNCTION public.sync_shift_publish_status()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  -- Skip sync for cancelled/deleted statuses
  IF NEW.status IN ('cancelled', 'deleted') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'open' THEN
      NEW.is_published := true;
      NEW.is_open_shift := true;
    ELSIF NEW.is_published = true AND (NEW.status IS NULL OR NEW.status = 'draft') THEN
      NEW.status := 'published';
    ELSIF NEW.status = 'published' THEN
      NEW.is_published := true;
    ELSIF NEW.status IS NULL OR NEW.status = 'draft' THEN
      NEW.status := 'draft';
      NEW.is_published := false;
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE path: detect which field changed and sync the other
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'open' THEN
      NEW.is_published := true;
      NEW.is_open_shift := true;
    ELSIF NEW.status = 'published' THEN
      NEW.is_published := true;
      NEW.is_open_shift := false;
    ELSIF NEW.status = 'draft' THEN
      NEW.is_published := false;
      NEW.is_open_shift := false;
    END IF;
  ELSIF OLD.is_published IS DISTINCT FROM NEW.is_published THEN
    IF NEW.is_published = true THEN
      NEW.status := CASE WHEN NEW.is_open_shift THEN 'open' ELSE 'published' END;
    ELSE
      NEW.status := 'draft';
      NEW.is_open_shift := false;
    END IF;
  END IF;

  RETURN NEW;
END; $$;
