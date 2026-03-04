-- Fix RLS failure in check_mutual_like trigger
-- The trigger function needs to be SECURITY DEFINER to bypass RLS when inserting matches
-- This is safe because the function only creates matches when mutual likes exist

-- Drop the existing trigger first
DROP TRIGGER IF EXISTS on_like_check_match ON likes;

-- Drop the existing function
DROP FUNCTION IF EXISTS check_mutual_like();

-- Recreate the function as SECURITY DEFINER
-- This allows the function to bypass RLS when checking for mutual likes and creating matches
CREATE OR REPLACE FUNCTION check_mutual_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM likes 
    WHERE from_user_id = NEW.to_user_id 
    AND to_user_id = NEW.from_user_id
  ) THEN
    INSERT INTO matches (user1_id, user2_id)
    VALUES (
      LEAST(NEW.from_user_id, NEW.to_user_id),
      GREATEST(NEW.from_user_id, NEW.to_user_id)
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_like_check_match
  AFTER INSERT ON likes
  FOR EACH ROW
  EXECUTE FUNCTION check_mutual_like();
