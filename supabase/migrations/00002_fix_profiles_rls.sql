-- Fix infinite recursion in profiles RLS policy
-- The original policy queried profiles within its USING clause, causing recursion

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view visible profiles at their gym" ON profiles;

-- Create a security definer function to get user's home_gym_id without RLS recursion
-- This function runs with the privileges of the function creator (postgres),
-- bypassing RLS policies
CREATE OR REPLACE FUNCTION get_user_home_gym_id(user_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT home_gym_id FROM profiles WHERE id = user_id;
$$;

-- Policy 1: Users can always view their own profile (no recursion)
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

-- Policy 2: Users can view other visible profiles at their gym
-- Uses the security definer function to avoid recursion
CREATE POLICY "Users can view visible profiles at their gym"
  ON profiles FOR SELECT
  USING (
    id != auth.uid()  -- Exclude own profile (covered by policy 1)
    AND is_visible = true
    AND home_gym_id IS NOT NULL
    AND home_gym_id = get_user_home_gym_id(auth.uid())
  );
