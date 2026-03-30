-- Gym Gems: RPC to return most-engaged profiles within radius, scored by likes/crush/matches/first messages received.
-- Uses viewer's reference location and optional max_distance_km (default 48 = 30 miles).

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

  -- Viewer's reference location and radius (cap at param for this feed)
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

COMMENT ON FUNCTION get_gym_gems(INTEGER) IS 'Returns visible nearby profiles ordered by engagement (likes, crush, matches, first messages received). Default radius 48km (~30 mi).';
