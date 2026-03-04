-- Add per-user last known location for proximity search
-- Uses PostGIS geography points (meters-based distance queries)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_location GEOGRAPHY(POINT, 4326),
  ADD COLUMN IF NOT EXISTS last_location_updated_at TIMESTAMPTZ;

-- Keep a spatial index for fast ST_DWithin checks
CREATE INDEX IF NOT EXISTS idx_profiles_last_location
  ON profiles
  USING GIST (last_location)
  WHERE last_location IS NOT NULL;

-- === Helper functions (avoid RLS recursion, implement fallback) ===

-- Reference location for a user: last_location if present else home gym location.
CREATE OR REPLACE FUNCTION get_user_reference_location(user_id UUID)
RETURNS GEOGRAPHY
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(p.last_location, g.location)
  FROM profiles p
  LEFT JOIN gyms g ON g.id = p.home_gym_id
  WHERE p.id = user_id;
$$;

-- Viewer max distance (km), default 50, clamped to >= 2km.
CREATE OR REPLACE FUNCTION get_user_max_distance_km(user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  raw_val TEXT;
  parsed_val INTEGER;
BEGIN
  SELECT (discovery_preferences->>'max_distance') INTO raw_val
  FROM profiles
  WHERE id = user_id;

  BEGIN
    parsed_val := NULLIF(raw_val, '')::INTEGER;
  EXCEPTION WHEN others THEN
    parsed_val := NULL;
  END;

  parsed_val := COALESCE(parsed_val, 50);
  RETURN GREATEST(parsed_val, 2);
END;
$$;

-- === RLS updates: allow nearby + matched profile visibility ===

-- Replace gym-scoped policy with proximity-based policy.
DROP POLICY IF EXISTS "Users can view visible profiles at their gym" ON profiles;

-- Nearby discover visibility (viewer radius only, meters-based).
CREATE POLICY "Users can view visible nearby profiles"
  ON profiles FOR SELECT
  USING (
    id <> auth.uid()
    AND is_visible = true
    AND is_onboarded = true
    AND ST_DWithin(
      get_user_reference_location(id),
      get_user_reference_location(auth.uid()),
      (get_user_max_distance_km(auth.uid()) * 1000)::DOUBLE PRECISION
    )
  );

-- Ensure matches/chat can still resolve joined profiles even when not nearby.
CREATE POLICY "Users can view matched profiles"
  ON profiles FOR SELECT
  USING (
    id <> auth.uid()
    AND EXISTS (
      SELECT 1
      FROM matches m
      WHERE (m.user1_id = auth.uid() AND m.user2_id = profiles.id)
         OR (m.user2_id = auth.uid() AND m.user1_id = profiles.id)
    )
  );

