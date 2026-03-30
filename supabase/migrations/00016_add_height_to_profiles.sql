-- Add height to profiles (format e.g. "5'10"")
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS height TEXT;
