-- User blocks: prevents blocked user from appearing in discover, chat, etc.

CREATE TABLE blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, blocked_user_id),
  CONSTRAINT blocks_distinct CHECK (user_id != blocked_user_id)
);

CREATE INDEX idx_blocks_user ON blocks(user_id);
CREATE INDEX idx_blocks_blocked ON blocks(blocked_user_id);

COMMENT ON TABLE blocks IS 'Users who have been blocked — hidden from discover, chat, and messaging';

ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own blocks"
  ON blocks FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own blocks"
  ON blocks FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own blocks"
  ON blocks FOR DELETE
  USING (user_id = auth.uid());
