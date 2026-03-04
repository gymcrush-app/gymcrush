-- Allow recipients to "decline" message requests (hide from their list)
-- Does not delete messages; sender is not notified

CREATE TABLE request_ignores (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, sender_id),
  CONSTRAINT request_ignores_distinct CHECK (user_id != sender_id)
);

CREATE INDEX idx_request_ignores_user ON request_ignores(user_id);

COMMENT ON TABLE request_ignores IS 'Recipients who have declined/hidden a message request from a sender';

ALTER TABLE request_ignores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own request ignores"
  ON request_ignores FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own request ignores"
  ON request_ignores FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own request ignores"
  ON request_ignores FOR DELETE
  USING (user_id = auth.uid());
