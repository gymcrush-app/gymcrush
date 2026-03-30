-- Gem tokens: daily gem to give, gem_gifts log, profile counts.
-- One gem per user per day (resets midnight local); client sends p_giver_today_start for server check.

-- Table: gem_gifts (who gave to whom, when)
CREATE TABLE IF NOT EXISTS gem_gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT gem_gifts_no_self CHECK (from_user_id <> to_user_id)
);

CREATE INDEX IF NOT EXISTS idx_gem_gifts_from_user_created ON gem_gifts(from_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gem_gifts_to_user ON gem_gifts(to_user_id);

ALTER TABLE gem_gifts ENABLE ROW LEVEL SECURITY;

-- Only the giver can insert their own row; anyone can read (for counts) is not needed — RPC is SECURITY DEFINER.
CREATE POLICY gem_gifts_insert_own ON gem_gifts
  FOR INSERT WITH CHECK (auth.uid() = from_user_id);

-- Profiles: when giver last gave; how many gems recipient has received
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_gem_given_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS gems_received_count INTEGER NOT NULL DEFAULT 0;

-- RPC: give one gem to a user. Enforces one gem per day (giver's "today" via p_giver_today_start).
CREATE OR REPLACE FUNCTION give_gym_gem(p_to_user_id UUID, p_giver_today_start TIMESTAMPTZ DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_giver_id UUID := auth.uid();
  v_giver_last TIMESTAMPTZ;
  v_today_start TIMESTAMPTZ;
  v_sender_name TEXT;
BEGIN
  IF v_giver_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF p_to_user_id IS NULL OR p_to_user_id = v_giver_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_recipient');
  END IF;

  -- Recipient must exist and be visible (optional soft check)
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_to_user_id AND is_onboarded = true) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'recipient_not_found');
  END IF;

  SELECT last_gem_given_at INTO v_giver_last FROM profiles WHERE id = v_giver_id;
  -- "Today" start: use client-provided start of day in giver's local time, or default to UTC midnight
  v_today_start := COALESCE(p_giver_today_start, date_trunc('day', now() AT TIME ZONE 'UTC'));

  -- Has already given today? (last_gem_given_at >= start of today)
  IF v_giver_last IS NOT NULL AND v_giver_last >= v_today_start THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_gem_available');
  END IF;

  -- Insert gift
  INSERT INTO gem_gifts (from_user_id, to_user_id) VALUES (v_giver_id, p_to_user_id);

  -- Update giver: last_gem_given_at = now()
  UPDATE profiles SET last_gem_given_at = now(), updated_at = now() WHERE id = v_giver_id;

  -- Increment recipient gems_received_count
  UPDATE profiles SET gems_received_count = gems_received_count + 1, updated_at = now() WHERE id = p_to_user_id;

  SELECT display_name INTO v_sender_name FROM profiles WHERE id = v_giver_id;

  RETURN jsonb_build_object(
    'ok', true,
    'from_user_id', v_giver_id,
    'to_user_id', p_to_user_id,
    'sender_display_name', v_sender_name
  );
END;
$$;

COMMENT ON TABLE gem_gifts IS 'Records each gym gem given; one per giver per calendar day (enforced in give_gym_gem).';
COMMENT ON FUNCTION give_gym_gem(UUID, TIMESTAMPTZ) IS 'Giver gives one daily gem to recipient. Returns { ok, error? }. Client should pass start of today (giver local) as second arg.';
