-- Gym Gems engagement formula v2 (2026-05-22).
--
-- Old formula (from 00041) double-counted message-comment likes and rewarded
-- derived signals (crush_received, matches_count, first_messages_received).
-- Crushes are dead — no UI produces them post-CrushSignalButton removal —
-- and matches are mathematically redundant since both sides already counted
-- as inbound likes.
--
-- New formula:
--   score = likes_received + 0.5 * comment_likes_received + 3 * gems_received
--
--   likes_received          : count of inbound `likes` rows (any is_crush_signal value)
--   comment_likes_received  : inbound `messages` rows with reaction_type IS NOT NULL
--                             (i.e. "comment likes" — like-plus-message from Discover)
--   gems_received           : inbound `gem_gifts` rows. Weighted 3x because gems
--                             are 1-per-day per giver (most deliberate signal).
--
-- Filters: applies the viewer's age / gender preferences, in addition to the
-- existing visibility, onboarding, proximity, blocks, and already-gifted gates.
-- This brings Gym Gems in line with Discover so the user doesn't see profiles
-- outside their stated preferences in either surface.
--
-- Return shape changed (crush_received, matches_count, first_messages_received
-- removed; comment_likes_received, gems_received added). Client `ProfileWithScore`
-- type updated alongside. DROP FUNCTION required because return signature changed.

BEGIN;

DROP FUNCTION IF EXISTS get_gym_gems(INTEGER);

CREATE OR REPLACE FUNCTION get_gym_gems(
  p_max_distance_km INTEGER DEFAULT 48,
  p_min_age INTEGER DEFAULT NULL,
  p_max_age INTEGER DEFAULT NULL,
  p_genders TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  profile JSONB,
  engagement_score NUMERIC,
  likes_received BIGINT,
  comment_likes_received BIGINT,
  gems_received BIGINT
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
      AND NOT is_blocked_pair(v_viewer_id, p.id)
      AND NOT EXISTS (
        SELECT 1 FROM gem_gifts g
        WHERE g.from_user_id = v_viewer_id AND g.to_user_id = p.id
      )
      AND ST_DWithin(
        get_user_reference_location(p.id),
        v_ref,
        v_radius_m
      )
      AND (p_min_age IS NULL OR p.age >= p_min_age)
      AND (p_max_age IS NULL OR p.age <= p_max_age)
      AND (p_genders IS NULL OR p.gender = ANY(p_genders))
  ),
  engagement AS (
    SELECT
      c.id,
      (SELECT COUNT(*)::BIGINT FROM likes l
        WHERE l.to_user_id = c.id) AS likes_r,
      (SELECT COUNT(*)::BIGINT FROM messages m
        WHERE m.to_user_id = c.id AND m.reaction_type IS NOT NULL) AS comment_likes_r,
      (SELECT COUNT(*)::BIGINT FROM gem_gifts g
        WHERE g.to_user_id = c.id) AS gems_r
    FROM candidates c
  )
  SELECT
    (to_jsonb(c.*) - 'last_location' - 'last_location_updated_at') AS profile,
    (
      COALESCE(e.likes_r, 0)
      + 0.5 * COALESCE(e.comment_likes_r, 0)
      + 3   * COALESCE(e.gems_r, 0)
    )::NUMERIC AS engagement_score,
    COALESCE(e.likes_r, 0) AS likes_received,
    COALESCE(e.comment_likes_r, 0) AS comment_likes_received,
    COALESCE(e.gems_r, 0) AS gems_received
  FROM candidates c
  JOIN engagement e ON e.id = c.id
  ORDER BY engagement_score DESC, c.created_at DESC NULLS LAST, c.id;
END;
$$;

COMMENT ON FUNCTION get_gym_gems(INTEGER, INTEGER, INTEGER, TEXT[]) IS
  'Returns visible nearby profiles ordered by engagement (likes + 0.5*comment_likes + 3*gems). Honors viewer''s age + gender prefs. Excludes self, blocked, and already-gifted recipients.';

COMMIT;
