-- Fix: add apikey header required by Supabase edge function gateway
CREATE OR REPLACE FUNCTION notify_match_created()
RETURNS TRIGGER AS $$
DECLARE
  base_url text;
  service_key text;
BEGIN
  base_url := current_setting('app.settings.edge_functions_url', true);
  service_key := current_setting('app.settings.edge_functions_anon_key', true);

  IF base_url IS NULL OR base_url = '' THEN
    RETURN NEW;
  END IF;

  IF service_key IS NULL OR service_key = '' THEN
    RETURN NEW;
  END IF;

  PERFORM extensions.http_post(
    url := base_url || '/send-match-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', service_key,
      'Authorization', 'Bearer ' || service_key
    ),
    body := jsonb_build_object('match_id', NEW.id)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
