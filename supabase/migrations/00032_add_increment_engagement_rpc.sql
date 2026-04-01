CREATE OR REPLACE FUNCTION increment_engagement_count(p_profile_prompt_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE profile_prompts
  SET engagement_count = engagement_count + 1,
      updated_at = now()
  WHERE id = p_profile_prompt_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
