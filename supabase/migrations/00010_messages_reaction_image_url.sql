-- Store photo URL when message is a reaction to an image (Re: Photo)
ALTER TABLE messages
  ADD COLUMN reaction_image_url TEXT;

COMMENT ON COLUMN messages.reaction_image_url IS 'Photo URL when reaction_type is image';
