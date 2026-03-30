-- Fast profile-by-ID lookup that bypasses the expensive RLS geo policy.
-- Checks access via cheap conditions first (own profile, matched user)
-- and only falls through to geo check if needed.

CREATE OR REPLACE FUNCTION get_profile_by_id(p_profile_id UUID)
RETURNS SETOF profiles
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

  -- Own profile: always allowed
  IF p_profile_id = v_viewer_id THEN
    RETURN QUERY SELECT * FROM profiles WHERE id = p_profile_id;
    RETURN;
  END IF;

  -- Matched user: always allowed (cheap index scan on matches)
  IF EXISTS (
    SELECT 1 FROM matches m
    WHERE (m.user1_id = v_viewer_id AND m.user2_id = p_profile_id)
       OR (m.user2_id = v_viewer_id AND m.user1_id = p_profile_id)
  ) THEN
    RETURN QUERY SELECT * FROM profiles WHERE id = p_profile_id;
    RETURN;
  END IF;

  -- Fallback: visible nearby profile (geo check, only runs if not matched)
  RETURN QUERY
  SELECT p.* FROM profiles p
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
