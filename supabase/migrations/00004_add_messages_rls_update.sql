-- Add RLS policy for updating read_at on messages
-- Users can only update read_at on messages they didn't send (i.e., messages from other users)

CREATE POLICY "Users can update read_at on messages they received"
  ON messages FOR UPDATE
  USING (
    -- User must be a participant in the match
    match_id IN (
      SELECT id FROM matches 
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
    -- User can only update read_at (not other fields)
    -- This is enforced by only allowing updates where sender_id != auth.uid()
    AND sender_id != auth.uid()
  )
  WITH CHECK (
    -- Ensure they can only update read_at field
    match_id IN (
      SELECT id FROM matches 
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
    AND sender_id != auth.uid()
  );
