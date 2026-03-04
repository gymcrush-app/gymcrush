-- Add google_place_id column to gyms table
ALTER TABLE gyms 
ADD COLUMN google_place_id TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX idx_gyms_google_place_id ON gyms(google_place_id);
