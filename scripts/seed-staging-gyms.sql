-- Seed staging gyms for reset-and-seed script
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor).
-- Use the returned UUIDs: set KELOWNA_GYM_ID to the first gym's id; optionally set Chris's home_gym_id to the second.

-- 1. Global Fitness & Racquet Centre, Kelowna, BC (Canada profiles)
-- 1574 Harvey Ave, Kelowna, BC V1Y 6G2, Canada
-- Coordinates (approx): 49.881, -119.456
SELECT insert_gym_with_location(
  NULL,  -- google_place_id (optional)
  'Global Fitness & Racquet Centre',
  '1574 Harvey Ave',
  'Kelowna',
  'BC',
  'Canada',
  -119.456,  -- lng
  49.881    -- lat
) AS kelowna_gym_id;
-- Copy the returned UUID and set KELOWNA_GYM_ID=<uuid> in .env.staging (or your env file).

-- 2. Uplifted Gym, Meridian, ID (Meridian profiles; set as Chris's home gym if desired)
-- 3410 W Nelis Dr STE 100, Meridian, ID 83646
-- Coordinates (approx): 43.614, -116.399
SELECT insert_gym_with_location(
  NULL,
  'Uplifted Gym',
  '3410 W Nelis Dr STE 100',
  'Meridian',
  'ID',
  'United States',
  -116.399,  -- lng
  43.614    -- lat
) AS meridian_gym_id;
-- Optional: update Chris's profile to use this gym:
-- UPDATE profiles SET home_gym_id = '<meridian_gym_id>' WHERE id = '3d122eec-0d3d-4d0b-afec-409051199d4d';
