-- Allow recipients to update request messages (set match_id when accepting)
-- so request messages move into the new match conversation

CREATE POLICY "Recipients can update request messages to add match_id"
  ON messages FOR UPDATE
  USING (
    to_user_id = auth.uid()
    AND match_id IS NULL
  )
  WITH CHECK (
    -- After update, message must be in a match where user is a participant
    match_id IN (
      SELECT id FROM matches
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );
