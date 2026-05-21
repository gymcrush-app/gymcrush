-- Drift cleanup: the production `matches` table has a single AFTER INSERT
-- trigger called "send-match-notification", created via the Supabase
-- Studio "Database Webhooks" UI. It works correctly (verified 2026-05-20:
-- 1 trigger, 1 push per match insert) but lives outside migrations and
-- embeds the project's service_role JWT inline.
--
-- Migrations 00028 + 00029 originally created a `pg_net`-based trigger
-- called `on_match_send_push_notification`, which was subsequently
-- deleted from remote (likely manually via Studio) when the Database
-- Webhooks trigger took over.
--
-- This migration replaces both with a single canonical trigger function
-- that:
--   * reads the service_role JWT from Supabase Vault (`vault.decrypted_secrets`
--     where name = 'service_role_key'). Vault is the supported Supabase
--     Cloud secret store — `ALTER DATABASE … SET app.settings.*` is blocked
--     for the managed `postgres` role;
--   * hardcodes the functions base URL (not a secret — it's derivable from
--     the project ref);
--   * POSTs `{"match_id": NEW.id}` to /send-match-notification via `pg_net`.
--     Edge function already accepts that payload (see
--     supabase/functions/send-match-notification/index.ts).
--
-- Required setup (see doc/TODO.md for exact SQL):
--   1. CREATE EXTENSION IF NOT EXISTS supabase_vault;  (no-op if already enabled)
--   2. SELECT vault.create_secret('<jwt>', 'service_role_key', …);
--      or vault.update_secret(...) if rotating the key.

BEGIN;

-- Idempotent drops: handles fresh-local (where 00028/00029 created
-- on_match_send_push_notification) and remote (where it doesn't exist).
DROP TRIGGER IF EXISTS on_match_send_push_notification ON public.matches;
DROP TRIGGER IF EXISTS "send-match-notification" ON public.matches;

-- Redefine the trigger function so the JWT is fetched at runtime from Vault.
CREATE OR REPLACE FUNCTION public.notify_match_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault
AS $$
DECLARE
  v_service_key TEXT;
  v_url         TEXT := 'https://nftmrxvrwyrlryqcurdh.supabase.co/functions/v1';
  v_request_id  BIGINT;
BEGIN
  SELECT decrypted_secret
  INTO v_service_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key'
  LIMIT 1;

  IF v_service_key IS NULL OR v_service_key = '' THEN
    RAISE WARNING 'notify_match_created: vault secret "service_role_key" not set; push skipped for match %', NEW.id;
    RETURN NEW;
  END IF;

  SELECT net.http_post(
    url     := v_url || '/send-match-notification',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body    := jsonb_build_object('match_id', NEW.id)
  ) INTO v_request_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_match_send_push_notification
  AFTER INSERT ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.notify_match_created();

COMMIT;
