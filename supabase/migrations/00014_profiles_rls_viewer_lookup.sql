-- Optimize profiles RLS: single current-user lookup for "visible nearby" policy
-- Replaces two separate calls (get_user_reference_location(auth.uid()) and get_user_max_distance_km(auth.uid()))
-- with one SECURITY DEFINER function that returns both for auth.uid().

CREATE OR REPLACE FUNCTION get_viewer_location_and_max_km()
RETURNS TABLE(reference_location GEOGRAPHY, max_distance_km INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(p.last_location, g.location),
    GREATEST(
      COALESCE(
        NULLIF(TRIM(p.discovery_preferences->>'max_distance'), '')::INTEGER,
        50
      ),
      2
    )
  FROM profiles p
  LEFT JOIN gyms g ON g.id = p.home_gym_id
  WHERE p.id = auth.uid();
END;
$$;

-- Recreate "visible nearby" policy to use the combined viewer lookup (one profile read per check).
DROP POLICY IF EXISTS "Users can view visible nearby profiles" ON profiles;

CREATE POLICY "Users can view visible nearby profiles"
  ON profiles FOR SELECT
  USING (
    id <> auth.uid()
    AND is_visible = true
    AND is_onboarded = true
    AND EXISTS (
      SELECT 1
      FROM get_viewer_location_and_max_km() v
      WHERE ST_DWithin(
        get_user_reference_location(profiles.id),
        v.reference_location,
        (v.max_distance_km * 1000)::DOUBLE PRECISION
      )
    )
  );
