-- Audit finding #2: precise last_location was exposed to any client that
-- could read the row. This migration removes last_location and
-- last_location_updated_at from every client-facing read path:
--
--   * New RPC discover_profiles returns the same shape as before minus
--     the location columns, plus a server-computed distance_km.
--   * get_profile_by_id is rewritten to RETURN TABLE without the location
--     columns (was previously RETURNS SETOF profiles).
--   * get_gym_gems strips the location keys from the returned JSONB.
--   * Column-level SELECT on profiles.last_location +
--     profiles.last_location_updated_at is revoked from authenticated +
--     anon. UPDATE remains so the sync hook still writes.
--
-- Client follow-up: every `from('profiles').select('*')` must enumerate
-- columns explicitly or move to RPC. See PROFILE_COLUMNS in lib/api/profiles.ts.

BEGIN;

-- =====================================================================
-- discover_profiles: server-side discover feed with distance projection
-- =====================================================================
-- Caller passes optional age/gender/home-gym filters. Function uses the
-- viewer's reference location (last_location || home gym) and max
-- distance from their preferences. Filters: visibility, onboarding,
-- self-exclusion, mutual-block exclusion, and proximity (unless
-- p_skip_distance for Gym Crush Mode).

CREATE OR REPLACE FUNCTION discover_profiles(
  p_min_age INTEGER DEFAULT NULL,
  p_max_age INTEGER DEFAULT NULL,
  p_genders TEXT[] DEFAULT NULL,
  p_home_gym_id UUID DEFAULT NULL,
  p_skip_distance BOOLEAN DEFAULT false
)
RETURNS TABLE (
  id UUID,
  display_name TEXT,
  age INTEGER,
  gender TEXT,
  bio TEXT,
  fitness_disciplines TEXT[],
  photo_urls TEXT[],
  home_gym_id UUID,
  is_visible BOOLEAN,
  is_onboarded BOOLEAN,
  discovery_preferences JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  height TEXT,
  occupation TEXT,
  last_gem_given_at TIMESTAMPTZ,
  gems_received_count INTEGER,
  religion TEXT,
  alcohol TEXT,
  smoking TEXT,
  marijuana TEXT,
  has_kids TEXT,
  ethnicity TEXT[],
  distance_km DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_viewer_id UUID := auth.uid();
  v_ref GEOGRAPHY;
  v_max_km INTEGER;
BEGIN
  IF v_viewer_id IS NULL THEN
    RETURN;
  END IF;

  SELECT vl.reference_location, vl.max_distance_km
  INTO v_ref, v_max_km
  FROM get_viewer_location_and_max_km() vl
  LIMIT 1;

  IF v_ref IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id, p.display_name, p.age, p.gender, p.bio, p.fitness_disciplines,
    p.photo_urls, p.home_gym_id, p.is_visible, p.is_onboarded,
    p.discovery_preferences, p.created_at, p.updated_at, p.height, p.occupation,
    p.last_gem_given_at, p.gems_received_count, p.religion, p.alcohol,
    p.smoking, p.marijuana, p.has_kids, p.ethnicity,
    CASE
      WHEN get_user_reference_location(p.id) IS NULL THEN NULL
      ELSE (ST_Distance(get_user_reference_location(p.id), v_ref) / 1000.0)::DOUBLE PRECISION
    END AS distance_km
  FROM profiles p
  WHERE p.id <> v_viewer_id
    AND p.is_visible = true
    AND p.is_onboarded = true
    AND NOT is_blocked_pair(v_viewer_id, p.id)
    AND (p_min_age IS NULL OR p.age >= p_min_age)
    AND (p_max_age IS NULL OR p.age <= p_max_age)
    AND (p_genders IS NULL OR p.gender = ANY(p_genders))
    AND (p_home_gym_id IS NULL OR p.home_gym_id = p_home_gym_id)
    AND (
      p_skip_distance = true
      OR (
        get_user_reference_location(p.id) IS NOT NULL
        AND ST_DWithin(
          get_user_reference_location(p.id),
          v_ref,
          (v_max_km * 1000)::DOUBLE PRECISION
        )
      )
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION discover_profiles(INTEGER, INTEGER, TEXT[], UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION discover_profiles(INTEGER, INTEGER, TEXT[], UUID, BOOLEAN) TO authenticated;

COMMENT ON FUNCTION discover_profiles(INTEGER, INTEGER, TEXT[], UUID, BOOLEAN) IS
  'Discover feed. Returns visible profiles within the viewer''s max distance, excluding self and mutual blocks. Projects distance_km; never returns last_location.';

-- =====================================================================
-- get_profile_by_id: return TABLE without last_location columns
-- =====================================================================
-- Previously RETURNS SETOF profiles (full row). Now an explicit column
-- list that mirrors the public columns.

DROP FUNCTION IF EXISTS get_profile_by_id(UUID);

CREATE OR REPLACE FUNCTION get_profile_by_id(p_profile_id UUID)
RETURNS TABLE (
  id UUID,
  display_name TEXT,
  age INTEGER,
  gender TEXT,
  bio TEXT,
  fitness_disciplines TEXT[],
  photo_urls TEXT[],
  home_gym_id UUID,
  is_visible BOOLEAN,
  is_onboarded BOOLEAN,
  discovery_preferences JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  height TEXT,
  occupation TEXT,
  last_gem_given_at TIMESTAMPTZ,
  gems_received_count INTEGER,
  religion TEXT,
  alcohol TEXT,
  smoking TEXT,
  marijuana TEXT,
  has_kids TEXT,
  ethnicity TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_viewer_id UUID := auth.uid();
BEGIN
  IF v_viewer_id IS NULL THEN
    RETURN;
  END IF;

  -- Own profile
  IF p_profile_id = v_viewer_id THEN
    RETURN QUERY
    SELECT
      p.id, p.display_name, p.age, p.gender, p.bio, p.fitness_disciplines,
      p.photo_urls, p.home_gym_id, p.is_visible, p.is_onboarded,
      p.discovery_preferences, p.created_at, p.updated_at, p.height, p.occupation,
      p.last_gem_given_at, p.gems_received_count, p.religion, p.alcohol,
      p.smoking, p.marijuana, p.has_kids, p.ethnicity
    FROM profiles p
    WHERE p.id = p_profile_id;
    RETURN;
  END IF;

  -- Matched user
  IF EXISTS (
    SELECT 1 FROM matches m
    WHERE (m.user1_id = v_viewer_id AND m.user2_id = p_profile_id)
       OR (m.user2_id = v_viewer_id AND m.user1_id = p_profile_id)
  ) THEN
    RETURN QUERY
    SELECT
      p.id, p.display_name, p.age, p.gender, p.bio, p.fitness_disciplines,
      p.photo_urls, p.home_gym_id, p.is_visible, p.is_onboarded,
      p.discovery_preferences, p.created_at, p.updated_at, p.height, p.occupation,
      p.last_gem_given_at, p.gems_received_count, p.religion, p.alcohol,
      p.smoking, p.marijuana, p.has_kids, p.ethnicity
    FROM profiles p
    WHERE p.id = p_profile_id;
    RETURN;
  END IF;

  -- Visible nearby fallback
  RETURN QUERY
  SELECT
    p.id, p.display_name, p.age, p.gender, p.bio, p.fitness_disciplines,
    p.photo_urls, p.home_gym_id, p.is_visible, p.is_onboarded,
    p.discovery_preferences, p.created_at, p.updated_at, p.height, p.occupation,
    p.last_gem_given_at, p.gems_received_count, p.religion, p.alcohol,
    p.smoking, p.marijuana, p.has_kids, p.ethnicity
  FROM profiles p
  WHERE p.id = p_profile_id
    AND p.is_visible = true
    AND p.is_onboarded = true
    AND EXISTS (
      SELECT 1
      FROM get_viewer_location_and_max_km() v
      WHERE ST_DWithin(
        COALESCE(p.last_location, (SELECT g.location FROM gyms g WHERE g.id = p.home_gym_id)),
        v.reference_location,
        (v.max_distance_km * 1000)::DOUBLE PRECISION
      )
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION get_profile_by_id(UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION get_profile_by_id(UUID) TO authenticated;

-- =====================================================================
-- get_gym_gems: strip last_location keys from the projected JSONB
-- =====================================================================
-- The function returned to_jsonb(c.*) which included last_location.
-- Subtract the two keys so the wire payload never carries them.

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
    (to_jsonb(c.*) - 'last_location' - 'last_location_updated_at') AS profile,
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

-- =====================================================================
-- Revoke column-level SELECT on the location columns
-- =====================================================================
-- After this point, any client query that includes last_location or
-- last_location_updated_at in the projection (including SELECT * via
-- PostgREST when the role lacks per-column SELECT) returns
-- "permission denied for column …". UPDATE on these columns is
-- unchanged (the sync hook keeps working).

REVOKE SELECT (last_location, last_location_updated_at) ON profiles FROM authenticated, anon;

COMMIT;
