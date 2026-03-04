-- Create function to create PostGIS geography point from lat/lng
-- This ensures consistent and reliable point creation for gym locations
CREATE OR REPLACE FUNCTION create_gym_location(
  lng double precision,
  lat double precision
) RETURNS geography AS $$
BEGIN
  RETURN ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add comment for documentation
COMMENT ON FUNCTION create_gym_location(double precision, double precision) IS 
  'Creates a PostGIS GEOGRAPHY(POINT, 4326) from longitude and latitude coordinates';

-- Create stored procedure to insert gym with PostGIS location
-- This ensures we use PostGIS functions directly in the database
CREATE OR REPLACE FUNCTION insert_gym_with_location(
  p_google_place_id TEXT,
  p_name TEXT,
  p_address TEXT,
  p_city TEXT,
  p_state TEXT,
  p_country TEXT,
  p_lng double precision,
  p_lat double precision
) RETURNS UUID AS $$
DECLARE
  v_gym_id UUID;
BEGIN
  INSERT INTO gyms (
    google_place_id,
    name,
    address,
    city,
    state,
    country,
    location
  ) VALUES (
    p_google_place_id,
    p_name,
    p_address,
    p_city,
    p_state,
    p_country,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
  )
  RETURNING id INTO v_gym_id;
  
  RETURN v_gym_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION insert_gym_with_location(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, double precision, double precision) IS 
  'Inserts a new gym with PostGIS GEOGRAPHY(POINT, 4326) location using ST_SetSRID and ST_MakePoint functions';
