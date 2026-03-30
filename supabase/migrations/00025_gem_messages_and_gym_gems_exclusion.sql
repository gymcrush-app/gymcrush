-- Link gem gifts to inbox messages; recipients can read their gem_gifts rows;
-- exclude "already gifted" profiles from get_gym_gems;
-- insert inbox message when give_gym_gem succeeds.

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS gem_gift_id UUID REFERENCES gem_gifts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_messages_gem_gift_id ON messages(gem_gift_id) WHERE gem_gift_id IS NOT NULL;

COMMENT ON COLUMN messages.gem_gift_id IS 'When set, this row is a Gym Gem notification tied to gem_gifts.';

-- Recipients (and givers) can read relevant gem_gifts for inbox/history
DROP POLICY IF EXISTS gem_gifts_select_involved ON gem_gifts;
CREATE POLICY gem_gifts_select_involved ON gem_gifts
  FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE OR REPLACE FUNCTION get_gym_gems(p_max_distance_km INTEGER DEFAULT 48)
RETURNS TABLE (
  profile JSONB,
  engagement_score NUMERIC,
  likes_received BIGINT,
  crush_received BIGINT,
  matches_count BIGINT,
  first_messages_received BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_viewer_id UUID := auth.uid();
  v_ref GEOGRAPHY;
  v_radius_m DOUBLE PRECISION;
BEGIN
  IF v_viewer_id IS NULL THEN
    RETURN;
  END IF;

  SELECT
    vl.reference_location,
    (LEAST(p_max_distance_km, vl.max_distance_km) * 1000)::DOUBLE PRECISION
  INTO v_ref, v_radius_m
  FROM get_viewer_location_and_max_km() vl
  LIMIT 1;

  IF v_ref IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT p.*
    FROM profiles p
    WHERE p.id <> v_viewer_id
      AND p.is_visible = true
      AND p.is_onboarded = true
      AND NOT EXISTS (
        SELECT 1 FROM gem_gifts g
        WHERE g.from_user_id = v_viewer_id AND g.to_user_id = p.id
      )
      AND ST_DWithin(
        get_user_reference_location(p.id),
        v_ref,
        v_radius_m
      )
  ),
  engagement AS (
    SELECT
      c.id,
      (SELECT COUNT(*)::BIGINT FROM likes l WHERE l.to_user_id = c.id AND (l.is_crush_signal IS NULL OR l.is_crush_signal = false)) AS likes_r,
      (SELECT COUNT(*)::BIGINT FROM likes l WHERE l.to_user_id = c.id AND l.is_crush_signal = true) AS crush_r,
      (SELECT COUNT(*)::BIGINT FROM matches m WHERE m.user1_id = c.id OR m.user2_id = c.id) AS matches_c,
      (
        SELECT COUNT(*)::BIGINT
        FROM (
          SELECT m.id,
            (SELECT msg.sender_id FROM messages msg WHERE msg.match_id = m.id ORDER BY msg.created_at ASC LIMIT 1) AS first_sender
          FROM matches m
          WHERE m.user1_id = c.id OR m.user2_id = c.id
        ) x
        WHERE x.first_sender IS NOT NULL AND x.first_sender <> c.id
      ) AS first_msgs_r
    FROM candidates c
  )
  SELECT
    to_jsonb(c.*) AS profile,
    (
      COALESCE(e.likes_r, 0)
      + 2 * COALESCE(e.crush_r, 0)
      + 0.5 * COALESCE(e.matches_c, 0)
      + 1.5 * COALESCE(e.first_msgs_r, 0)
    )::NUMERIC AS engagement_score,
    COALESCE(e.likes_r, 0) AS likes_received,
    COALESCE(e.crush_r, 0) AS crush_received,
    COALESCE(e.matches_c, 0) AS matches_count,
    COALESCE(e.first_msgs_r, 0) AS first_messages_received
  FROM candidates c
  JOIN engagement e ON e.id = c.id
  ORDER BY engagement_score DESC, c.created_at DESC NULLS LAST, c.id;
END;
$$;

COMMENT ON FUNCTION get_gym_gems(INTEGER) IS
  'Returns visible nearby profiles ordered by engagement. Excludes anyone the viewer has already sent a gym gem to.';

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
  v_gift_id UUID;
  v_match_id UUID;
  v_gem_body TEXT := 'Sent you a Gym Gem ✦';
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

COMMENT ON FUNCTION give_gym_gem(UUID, TIMESTAMPTZ) IS
  'Giver gives one daily gem; logs gift, increments counts, inserts inbox message (match thread if matched, else request-style to_user_id).';
