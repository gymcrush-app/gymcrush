-- Enable extensions
CREATE EXTENSION IF NOT EXISTS postgis;

-- Gyms table
CREATE TABLE gyms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  country TEXT NOT NULL,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  age INTEGER NOT NULL CHECK (age >= 18 AND age <= 100),
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'non-binary', 'prefer-not-to-say')),
  bio TEXT CHECK (length(bio) <= 300),
  approach_prompt TEXT CHECK (length(approach_prompt) <= 100),
  fitness_disciplines TEXT[] NOT NULL DEFAULT '{}',
  photo_urls TEXT[] NOT NULL CHECK (array_length(photo_urls, 1) >= 1 AND array_length(photo_urls, 1) <= 6),
  home_gym_id UUID REFERENCES gyms(id),
  is_visible BOOLEAN DEFAULT true,
  is_onboarded BOOLEAN DEFAULT false,
  discovery_preferences JSONB DEFAULT '{"min_age": 18, "max_age": 100, "genders": []}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Likes table
CREATE TABLE likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_crush_signal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(from_user_id, to_user_id),
  CHECK (from_user_id != to_user_id)
);

-- Matches table
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user1_id, user2_id),
  CHECK (user1_id < user2_id)
);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 500),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Reports table
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('inappropriate', 'fake', 'harassment', 'other')),
  details TEXT CHECK (length(details) <= 500),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'action_taken')),
  created_at TIMESTAMPTZ DEFAULT now(),
  CHECK (reporter_id != reported_user_id)
);

-- Indexes
CREATE INDEX idx_profiles_home_gym ON profiles(home_gym_id) WHERE home_gym_id IS NOT NULL;
CREATE INDEX idx_profiles_visible ON profiles(is_visible) WHERE is_visible = true;
CREATE INDEX idx_likes_from_user ON likes(from_user_id);
CREATE INDEX idx_likes_to_user ON likes(to_user_id);
CREATE INDEX idx_matches_user1 ON matches(user1_id);
CREATE INDEX idx_matches_user2 ON matches(user2_id);
CREATE INDEX idx_messages_match ON messages(match_id, created_at DESC);
CREATE INDEX idx_gyms_location ON gyms USING GIST(location);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE gyms ENABLE ROW LEVEL SECURITY;

-- Profiles RLS
CREATE POLICY "Users can view visible profiles at their gym"
  ON profiles FOR SELECT
  USING (
    is_visible = true 
    AND home_gym_id = (SELECT home_gym_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- Likes RLS
CREATE POLICY "Users can insert own likes"
  ON likes FOR INSERT
  WITH CHECK (from_user_id = auth.uid());

CREATE POLICY "Users can view likes they sent or received"
  ON likes FOR SELECT
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

-- Matches RLS
CREATE POLICY "Users can view their matches"
  ON matches FOR SELECT
  USING (user1_id = auth.uid() OR user2_id = auth.uid());

-- Messages RLS
CREATE POLICY "Users can view messages in their matches"
  ON messages FOR SELECT
  USING (
    match_id IN (
      SELECT id FROM matches 
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages in their matches"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND match_id IN (
      SELECT id FROM matches 
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

-- Reports RLS
CREATE POLICY "Users can insert own reports"
  ON reports FOR INSERT
  WITH CHECK (reporter_id = auth.uid());

-- Gyms RLS (public read)
CREATE POLICY "Anyone can view gyms"
  ON gyms FOR SELECT
  USING (true);

-- Trigger: Auto-create match on mutual like
CREATE OR REPLACE FUNCTION check_mutual_like()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM likes 
    WHERE from_user_id = NEW.to_user_id 
    AND to_user_id = NEW.from_user_id
  ) THEN
    INSERT INTO matches (user1_id, user2_id)
    VALUES (
      LEAST(NEW.from_user_id, NEW.to_user_id),
      GREATEST(NEW.from_user_id, NEW.to_user_id)
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_like_check_match
  AFTER INSERT ON likes
  FOR EACH ROW
  EXECUTE FUNCTION check_mutual_like();

-- Updated_at trigger for profiles
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
