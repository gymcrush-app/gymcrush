-- Allow users to view the profile of anyone who sent them a message
-- (or whom they sent a message to). This covers the Crushes tab where
-- message requests and gem inbox entries join sender profiles.

CREATE POLICY "Users can view profiles of message participants"
  ON profiles FOR SELECT
  USING (
    id <> auth.uid()
    AND EXISTS (
      SELECT 1 FROM messages m
      WHERE (m.sender_id = profiles.id AND m.to_user_id = auth.uid())
         OR (m.sender_id = auth.uid() AND m.to_user_id = profiles.id)
    )
  );
