-- Trigger: send push notification on new message
--
-- Fires for both match chat messages (match_id set) and message requests (to_user_id set).
-- Uses pg_net to POST to a Supabase Edge Function asynchronously.
-- Requires app.settings.edge_functions_url and app.settings.edge_functions_anon_key
-- (same DB settings as the match notification trigger).

CREATE OR REPLACE FUNCTION notify_message_created()
RETURNS TRIGGER AS $$
DECLARE
  base_url text;
  anon_key text;
BEGIN
  base_url := current_setting('app.settings.edge_functions_url', true);
  anon_key := current_setting('app.settings.edge_functions_anon_key', true);

  IF base_url IS NULL OR base_url = '' THEN
    RETURN NEW;
  END IF;

  PERFORM extensions.net.http_post(
    url := base_url || '/send-message-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', CASE
        WHEN anon_key IS NULL OR anon_key = '' THEN 'Bearer missing'
        ELSE 'Bearer ' || anon_key
      END
    ),
    body := jsonb_build_object(
      'record', jsonb_build_object(
        'id', NEW.id,
        'sender_id', NEW.sender_id,
        'match_id', NEW.match_id,
        'to_user_id', NEW.to_user_id,
        'content', NEW.content
      )
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_message_send_push_notification ON messages;
CREATE TRIGGER on_message_send_push_notification
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_message_created();
