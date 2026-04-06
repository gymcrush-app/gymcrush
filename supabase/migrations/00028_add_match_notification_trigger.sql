-- Trigger: send push notification on new match
--
-- This uses pg_net to POST to a Supabase Edge Function asynchronously.
-- Configure these DB settings in your Supabase project (not in git):
--   alter database postgres set app.settings.edge_functions_url = 'https://<project-ref>.supabase.co/functions/v1';
--   alter database postgres set app.settings.edge_functions_anon_key = '<anon key>';
--
-- For local dev you can set:
--   alter database postgres set app.settings.edge_functions_url = 'http://127.0.0.1:54321/functions/v1';
--
-- Note: The HTTP request is queued and will only execute after the transaction commits.

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION notify_match_created()
RETURNS TRIGGER AS $$
DECLARE
  base_url text;
  anon_key text;
BEGIN
  base_url := current_setting('app.settings.edge_functions_url', true);
  anon_key := current_setting('app.settings.edge_functions_anon_key', true);

  IF base_url IS NULL OR base_url = '' THEN
    -- No configuration: skip silently to avoid breaking inserts
    RETURN NEW;
  END IF;

  PERFORM extensions.net.http_post(
    url := base_url || '/send-match-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', CASE
        WHEN anon_key IS NULL OR anon_key = '' THEN 'Bearer missing'
        ELSE 'Bearer ' || anon_key
      END
    ),
    body := jsonb_build_object('match_id', NEW.id)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_match_send_push_notification ON matches;
CREATE TRIGGER on_match_send_push_notification
  AFTER INSERT ON matches
  FOR EACH ROW
  EXECUTE FUNCTION notify_match_created();

