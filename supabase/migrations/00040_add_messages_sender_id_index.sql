-- Speed up message queries that filter or join on sender_id.
-- Used by:
--   - Realtime FK joins (messages.sender_id -> profiles.id)
--   - Unread-count and per-sender lookups (request inbox + per-thread unread)
--   - Future RLS policies / RPCs that filter by sender
CREATE INDEX IF NOT EXISTS idx_messages_sender_id
  ON messages (sender_id, created_at DESC);

-- Partial index for unread message-request counts (no match yet).
-- Targets: messages where (to_user_id = me AND match_id IS NULL AND read_at IS NULL).
CREATE INDEX IF NOT EXISTS idx_messages_unread_requests
  ON messages (to_user_id, sender_id)
  WHERE match_id IS NULL AND read_at IS NULL;

-- Partial index for unread per-thread counts.
-- Targets: messages where (match_id = X AND sender_id = otherUser AND read_at IS NULL).
CREATE INDEX IF NOT EXISTS idx_messages_unread_threads
  ON messages (match_id, sender_id)
  WHERE read_at IS NULL;
