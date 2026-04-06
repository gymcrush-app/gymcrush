-- Allow give_gym_gem to accept an optional custom message instead of the hardcoded default.

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

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_to_user_id AND is_onboarded = true) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'recipient_not_found');
  END IF;

  SELECT last_gem_given_at INTO v_giver_last FROM profiles WHERE id = v_giver_id;
  v_today_start := COALESCE(p_giver_today_start, date_trunc('day', now() AT TIME ZONE 'UTC'));

  IF v_giver_last IS NOT NULL AND v_giver_last >= v_today_start THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_gem_available');
  END IF;

  -- Use custom message or fallback to default
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

COMMENT ON FUNCTION give_gym_gem(UUID, TIMESTAMPTZ, TEXT) IS
  'Giver gives one daily gem; logs gift, increments counts, inserts inbox message with optional custom content.';
