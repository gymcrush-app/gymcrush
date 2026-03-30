-- Optimize the "visible nearby profiles" RLS policy to avoid per-row function calls.
-- The previous policy called get_user_reference_location(profiles.id) for every candidate row,
-- which performs a profiles+gyms JOIN per row. Replace with an inline subquery that the planner
-- can fold into the main query as a single join.

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
        COALESCE(profiles.last_location, (SELECT g.location FROM gyms g WHERE g.id = profiles.home_gym_id)),
        v.reference_location,
        (v.max_distance_km * 1000)::DOUBLE PRECISION
      )
    )
  );
