-- Pre-launch RLS hardening based on the 2026-05-20 audit.
-- Addresses findings #1, #3, #4, #5, #9, #10.
--   #1  profile_prompts SELECT was wide open to all authenticated users
--   #3  messages UPDATE allowed recipients to mutate any column (not just read_at)
--   #4  blocks not enforced in messages INSERT, likes INSERT, give_gym_gem
--   #5  increment_engagement_count had no auth check
--   #9  helper SECURITY DEFINER functions directly callable by anon
--   #10 profiles + profile_prompts UPDATE had no WITH CHECK
-- Finding #2 (precise last_location exposure) is intentionally NOT addressed here —
-- it is a product decision (bucketed vs precise distance) to be made with the client.

BEGIN;

-- =====================================================================
-- #1: profile_prompts SELECT — delegate to profiles visibility
-- =====================================================================
-- The inner SELECT against profiles is itself subject to RLS, so this
-- policy automatically mirrors whatever profiles SELECT permits (self,
-- matched, or visible-nearby). Self is short-circuited for speed.

DROP POLICY IF EXISTS "Authenticated users can read all profile_prompts" ON profile_prompts;

CREATE POLICY "Users can read visible profile_prompts"
  ON profile_prompts FOR SELECT
  TO authenticated
  USING (
    profile_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = profile_prompts.profile_id)
  );

-- =====================================================================
-- #10: Add WITH CHECK to UPDATE policies (defense-in-depth)
-- =====================================================================

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile_prompts" ON profile_prompts;
CREATE POLICY "Users can update own profile_prompts"
  ON profile_prompts FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- =====================================================================
-- #4: blocks enforcement — helper function + policy/RPC updates
-- =====================================================================

CREATE OR REPLACE FUNCTION is_blocked_pair(a UUID, b UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM blocks
    WHERE (user_id = a AND blocked_user_id = b)
       OR (user_id = b AND blocked_user_id = a)
  );
$$;

REVOKE EXECUTE ON FUNCTION is_blocked_pair(UUID, UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION is_blocked_pair(UUID, UUID) TO authenticated;

DROP POLICY IF EXISTS "Users can insert their messages" ON messages;
CREATE POLICY "Users can insert their messages"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      (match_id IS NOT NULL AND match_id IN (
        SELECT id FROM matches WHERE user1_id = auth.uid() OR user2_id = auth.uid()
      ))
      OR (to_user_id IS NOT NULL)
    )
    AND NOT is_blocked_pair(
      auth.uid(),
      COALESCE(
        to_user_id,
        (SELECT CASE WHEN m.user1_id = auth.uid() THEN m.user2_id ELSE m.user1_id END
         FROM matches m WHERE m.id = match_id)
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert own likes" ON likes;
CREATE POLICY "Users can insert own likes"
  ON likes FOR INSERT
  WITH CHECK (
    from_user_id = auth.uid()
    AND NOT is_blocked_pair(auth.uid(), to_user_id)
  );

-- give_gym_gem: refuse if either side has blocked the other.
CREATE OR REPLACE FUNCTION give_gym_gem(
  p_to_user_id UUID,
  p_giver_today_start TIMESTAMPTZ DEFAULT NULL,
  p_message TEXT DEFAULT NULL
)
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
  v_gift_id UUID;
  v_match_id UUID;
  v_gem_body TEXT;
BEGIN
  IF v_giver_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF p_to_user_id IS NULL OR p_to_user_id = v_giver_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_recipient');
  END IF;

  IF is_blocked_pair(v_giver_id, p_to_user_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'blocked');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_to_user_id AND is_onboarded = true) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'recipient_not_found');
  END IF;

  SELECT last_gem_given_at INTO v_giver_last FROM profiles WHERE id = v_giver_id;
  v_today_start := COALESCE(p_giver_today_start, date_trunc('day', now() AT TIME ZONE 'UTC'));

  IF v_giver_last IS NOT NULL AND v_giver_last >= v_today_start THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_gem_available');
  END IF;

  v_gem_body := COALESCE(NULLIF(TRIM(p_message), ''), 'Sent you a Gym Gem ✦');

  INSERT INTO gem_gifts (from_user_id, to_user_id)
  VALUES (v_giver_id, p_to_user_id)
  RETURNING id INTO v_gift_id;

  UPDATE profiles SET last_gem_given_at = now(), updated_at = now() WHERE id = v_giver_id;
  UPDATE profiles SET gems_received_count = gems_received_count + 1, updated_at = now() WHERE id = p_to_user_id;

  SELECT id INTO v_match_id
  FROM matches
  WHERE user1_id = LEAST(v_giver_id, p_to_user_id)
    AND user2_id = GREATEST(v_giver_id, p_to_user_id)
  LIMIT 1;

  IF v_match_id IS NOT NULL THEN
    INSERT INTO messages (match_id, sender_id, content, gem_gift_id)
    VALUES (v_match_id, v_giver_id, v_gem_body, v_gift_id);
  ELSE
    INSERT INTO messages (sender_id, content, gem_gift_id, to_user_id)
    VALUES (v_giver_id, v_gem_body, v_gift_id, p_to_user_id);
  END IF;

  SELECT display_name INTO v_sender_name FROM profiles WHERE id = v_giver_id;

  RETURN jsonb_build_object(
    'ok', true,
    'from_user_id', v_giver_id,
    'to_user_id', p_to_user_id,
    'sender_display_name', v_sender_name
  );
END;
$$;

-- =====================================================================
-- #3: messages recipient UPDATE — column whitelist via trigger
-- =====================================================================
-- The existing UPDATE policies (00004 + 00012) gate WHICH rows a
-- recipient can update. This trigger gates WHICH COLUMNS they may
-- change: read_at, plus a one-time NULL → non-NULL match_id promotion
-- when accepting a message request.
-- Service-role and sender-side calls bypass; recipient-side mutations
-- are constrained.

CREATE OR REPLACE FUNCTION enforce_messages_recipient_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() IS NULL OR NEW.sender_id = auth.uid() THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.to_user_id IS DISTINCT FROM OLD.to_user_id
     OR NEW.content IS DISTINCT FROM OLD.content
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.reaction_type IS DISTINCT FROM OLD.reaction_type
     OR NEW.reaction_prompt_title IS DISTINCT FROM OLD.reaction_prompt_title
     OR NEW.reaction_prompt_answer IS DISTINCT FROM OLD.reaction_prompt_answer
     OR NEW.reaction_image_url IS DISTINCT FROM OLD.reaction_image_url
     OR NEW.gem_gift_id IS DISTINCT FROM OLD.gem_gift_id
     OR (OLD.match_id IS NOT NULL AND NEW.match_id IS DISTINCT FROM OLD.match_id)
  THEN
    RAISE EXCEPTION 'recipients can only update read_at (and accept request via match_id)';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_recipient_update_guard ON messages;
CREATE TRIGGER messages_recipient_update_guard
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION enforce_messages_recipient_update();

-- =====================================================================
-- #5: increment_engagement_count — require auth + skip own prompts
-- =====================================================================

CREATE OR REPLACE FUNCTION increment_engagement_count(p_profile_prompt_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF EXISTS (
    SELECT 1 FROM profile_prompts
    WHERE id = p_profile_prompt_id AND profile_id = auth.uid()
  ) THEN
    RETURN;
  END IF;

  UPDATE profile_prompts
  SET engagement_count = engagement_count + 1,
      updated_at = now()
  WHERE id = p_profile_prompt_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION increment_engagement_count(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION increment_engagement_count(uuid) TO authenticated;

-- =====================================================================
-- #9: Lock down SECURITY DEFINER helpers from direct anon/public callers
-- =====================================================================
-- Internal RLS calls reach these via other SECURITY DEFINER wrappers
-- (which run as their owner), so revoking direct EXECUTE does not break
-- the policy chain.

REVOKE EXECUTE ON FUNCTION get_user_home_gym_id(UUID)        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION get_user_reference_location(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION get_user_max_distance_km(UUID)    FROM PUBLIC, anon, authenticated;

-- Client uses insert_gym_with_location during onboarding gym selection — keep authenticated.
REVOKE EXECUTE ON FUNCTION insert_gym_with_location(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, double precision, double precision) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION insert_gym_with_location(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, double precision, double precision) TO authenticated;

-- is_plus: drop the anon grant — Plus-status probing is unneeded for anon.
REVOKE EXECUTE ON FUNCTION public.is_plus(uuid) FROM anon;

COMMIT;
