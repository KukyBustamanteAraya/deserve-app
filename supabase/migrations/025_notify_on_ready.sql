-- Trigger to notify app when a design becomes 'ready' (hook for email/WS)
CREATE OR REPLACE FUNCTION public.notify_design_ready()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'ready' AND COALESCE(OLD.status,'') <> 'ready' THEN
    PERFORM pg_notify('design_ready', NEW.id::text);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_design_ready ON public.design_requests;
CREATE TRIGGER trg_notify_design_ready
AFTER UPDATE ON public.design_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_design_ready();
