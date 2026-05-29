-- Support messages table — in-app feedback form submissions
-- (Bug reports, support questions, general feedback).
--
-- Inserts happen from the client via direct supabase-js call OR via the
-- send-support-message Edge Function (which also forwards to support@ via
-- Resend). Either path enforces RLS: a logged-in user may only insert/select
-- rows where user_id = auth.uid().

BEGIN;

CREATE TABLE IF NOT EXISTS public.support_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL CHECK (kind IN ('bug', 'question', 'feedback')),
  subject       TEXT NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 200),
  body          TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  app_version   TEXT,
  platform      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS support_messages_user_id_created_at_idx
  ON public.support_messages (user_id, created_at DESC);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "support_messages_insert_own" ON public.support_messages;
CREATE POLICY "support_messages_insert_own"
  ON public.support_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "support_messages_select_own" ON public.support_messages;
CREATE POLICY "support_messages_select_own"
  ON public.support_messages
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

COMMIT;
