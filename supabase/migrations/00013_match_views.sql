-- Track when a user has "viewed" a match (opened the chat).
-- Used to show/hide the "new match" dot: show dot until user has viewed the match.

CREATE TABLE match_views (
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (match_id, user_id)
);

CREATE INDEX idx_match_views_user ON match_views(user_id);

COMMENT ON TABLE match_views IS 'When each user last viewed a match chat (for new-match indicator)';

ALTER TABLE match_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own match views"
  ON match_views FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own match views"
  ON match_views FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own match views"
  ON match_views FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
