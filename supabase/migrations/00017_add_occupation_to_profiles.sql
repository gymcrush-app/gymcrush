-- Add optional occupation to profiles (single-line text)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS occupation TEXT;
