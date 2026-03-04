-- Add optional reaction context to messages (prompt or image)
-- Used when a message is sent from discover in reaction to a prompt answer or photo

ALTER TABLE messages
  ADD COLUMN reaction_type TEXT CHECK (reaction_type IN ('prompt', 'image')),
  ADD COLUMN reaction_prompt_title TEXT,
  ADD COLUMN reaction_prompt_answer TEXT;

COMMENT ON COLUMN messages.reaction_type IS 'What the message is reacting to: prompt answer or image';
COMMENT ON COLUMN messages.reaction_prompt_title IS 'Prompt question/title when reaction_type is prompt';
COMMENT ON COLUMN messages.reaction_prompt_answer IS 'Their answer text when reaction_type is prompt';
