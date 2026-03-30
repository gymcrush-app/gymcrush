-- Allow users to delete (unmatch) only their own matches
CREATE POLICY "Users can delete their matches"
  ON matches FOR DELETE
  USING (user1_id = auth.uid() OR user2_id = auth.uid());
