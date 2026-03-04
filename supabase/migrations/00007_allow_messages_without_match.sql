-- Allow messages without a match (for message requests)
-- This enables users to send messages from prompt/image chat before mutual match

-- Make match_id nullable
ALTER TABLE messages ALTER COLUMN match_id DROP NOT NULL;

-- Add to_user_id column to identify recipient when match_id is NULL
ALTER TABLE messages ADD COLUMN to_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Add constraint: either match_id or to_user_id must be set
ALTER TABLE messages ADD CONSTRAINT messages_match_or_to_user_check 
  CHECK ((match_id IS NOT NULL) OR (to_user_id IS NOT NULL));

-- Add index for to_user_id queries
CREATE INDEX idx_messages_to_user ON messages(to_user_id, created_at DESC) WHERE to_user_id IS NOT NULL;

-- Update RLS policies to allow messages without match_id
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view messages in their matches" ON messages;
DROP POLICY IF EXISTS "Users can insert messages in their matches" ON messages;

-- New policy: Users can view messages where:
-- 1. They are in a match (existing behavior)
-- 2. They are the recipient (to_user_id = auth.uid())
-- 3. They are the sender (sender_id = auth.uid())
CREATE POLICY "Users can view their messages"
  ON messages FOR SELECT
  USING (
    -- Messages in matches where user is involved
    (match_id IS NOT NULL AND match_id IN (
      SELECT id FROM matches 
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    ))
    OR
    -- Messages where user is the recipient
    (to_user_id = auth.uid())
    OR
    -- Messages where user is the sender
    (sender_id = auth.uid())
  );

-- New policy: Users can insert messages where:
-- 1. They are the sender (sender_id = auth.uid())
-- 2. Either match_id exists and user is in the match, OR to_user_id is set
CREATE POLICY "Users can insert their messages"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      -- Message in a match where user is involved
      (match_id IS NOT NULL AND match_id IN (
        SELECT id FROM matches 
        WHERE user1_id = auth.uid() OR user2_id = auth.uid()
      ))
      OR
      -- Message request (to_user_id is set)
      (to_user_id IS NOT NULL)
    )
  );

-- Add comment for documentation
COMMENT ON COLUMN messages.to_user_id IS 
  'Recipient user ID when message is sent without a match (message request)';
