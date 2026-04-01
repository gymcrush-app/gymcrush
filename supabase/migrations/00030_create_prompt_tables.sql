-- Create prompt_sections table
CREATE TABLE prompt_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subtitle text NOT NULL,
  display_order int NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create prompts table
CREATE TABLE prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES prompt_sections(id) ON DELETE CASCADE,
  prompt_text text NOT NULL,
  display_order int NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(section_id, display_order)
);

-- Create profile_prompts table
CREATE TABLE profile_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  prompt_id uuid NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES prompt_sections(id) ON DELETE CASCADE,
  answer text NOT NULL,
  engagement_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(profile_id, section_id)
);

-- Indexes
CREATE INDEX idx_profile_prompts_profile_id ON profile_prompts(profile_id);
CREATE INDEX idx_prompts_section_id ON prompts(section_id);

-- RLS
ALTER TABLE prompt_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_prompts ENABLE ROW LEVEL SECURITY;

-- prompt_sections: read-only for authenticated users
CREATE POLICY "Authenticated users can read prompt_sections"
  ON prompt_sections FOR SELECT
  TO authenticated
  USING (true);

-- prompts: read-only for authenticated users
CREATE POLICY "Authenticated users can read prompts"
  ON prompts FOR SELECT
  TO authenticated
  USING (true);

-- profile_prompts: read for authenticated, write for own
CREATE POLICY "Authenticated users can read all profile_prompts"
  ON profile_prompts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own profile_prompts"
  ON profile_prompts FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can update own profile_prompts"
  ON profile_prompts FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Users can delete own profile_prompts"
  ON profile_prompts FOR DELETE
  TO authenticated
  USING (profile_id = auth.uid());

-- Seed sections
INSERT INTO prompt_sections (name, subtitle, display_order) VALUES
  ('Who I Am', 'personality, quirks, daily life', 1),
  ('How I Think', 'values, opinions, worldview', 2),
  ('What I''m Into', 'passions, hobbies, obsessions', 3),
  ('Where I''m Headed', 'goals, lifestyle, ambitions', 4),
  ('How I Love', 'relationship style, dealbreakers, what I bring to a partnership', 5),
  ('Let''s Have Fun', 'lighthearted, hypothetical, icebreakers', 6),
  ('Sweat Life', 'gym, fitness, exercise', 7);

-- Seed prompts for each section
-- Who I Am (display_order = 1)
INSERT INTO prompts (section_id, prompt_text, display_order)
SELECT s.id, p.prompt_text, p.display_order
FROM prompt_sections s,
(VALUES
  ('The thing most people don''t realize about me until they know me well is...', 1),
  ('My friends would describe me as _____, but I''d describe myself as...', 2),
  ('The quirk I''ve fully accepted about myself is...', 3),
  ('On a random Tuesday night you''ll probably find me...', 4),
  ('The role I always end up playing in a friend group is...', 5),
  ('I''m a lot more _____ than I probably come across at first', 6),
  ('I recharge by...', 7),
  ('People either love or are puzzled by my obsession with...', 8),
  ('I grew up as the _____ kid and honestly still am', 9),
  ('I''m convinced I was built for...', 10)
) AS p(prompt_text, display_order)
WHERE s.display_order = 1;

-- How I Think (display_order = 2)
INSERT INTO prompts (section_id, prompt_text, display_order)
SELECT s.id, p.prompt_text, p.display_order
FROM prompt_sections s,
(VALUES
  ('The opinion I hold that surprises most people is...', 1),
  ('I will always argue that...', 2),
  ('The thing I''ve changed my mind on completely is...', 3),
  ('I think the most underrated thing in life is...', 4),
  ('The thing society accepts that I quietly disagree with is...', 5),
  ('The question I keep coming back to in life is...', 6),
  ('The older I get the more I believe...', 7),
  ('I judge a person''s character by...', 8),
  ('I think kindness looks like...', 9),
  ('The belief I hold that most people my age don''t seem to share is...', 10)
) AS p(prompt_text, display_order)
WHERE s.display_order = 2;

-- What I'm Into (display_order = 3)
INSERT INTO prompts (section_id, prompt_text, display_order)
SELECT s.id, p.prompt_text, p.display_order
FROM prompt_sections s,
(VALUES
  ('The hobby I can talk about for hours without noticing is...', 1),
  ('I''m currently obsessed with...', 2),
  ('The niche interest I wish more people knew about is...', 3),
  ('The last thing I fell down a rabbit hole about was...', 4),
  ('The thing I''m into that people don''t expect based on how I look is...', 5),
  ('My taste in _____ says everything about me', 6),
  ('I''ve been doing _____ since I was a kid and still love it', 7),
  ('The thing I spend way too much money on without regret is...', 8),
  ('The experience I keep chasing is...', 9),
  ('The interest I wish I had more people in my life to share with is...', 10)
) AS p(prompt_text, display_order)
WHERE s.display_order = 3;

-- Where I'm Headed (display_order = 4)
INSERT INTO prompts (section_id, prompt_text, display_order)
SELECT s.id, p.prompt_text, p.display_order
FROM prompt_sections s,
(VALUES
  ('The life I''m actively building looks like...', 1),
  ('The thing I''m working toward that excites me most right now is...', 2),
  ('My version of "making it" looks like...', 3),
  ('The chapter of life I feel like I''m in right now is...', 4),
  ('I used to think success meant _____ but now I think it means...', 5),
  ('The dream I''ve never fully let go of is...', 6),
  ('I''m building a life that prioritizes...', 7),
  ('I want to look back at this time in my life and know that I...', 8),
  ('The decision I made recently that changed my direction was...', 9),
  ('The thing that keeps me moving forward is...', 10)
) AS p(prompt_text, display_order)
WHERE s.display_order = 4;

-- How I Love (display_order = 5)
INSERT INTO prompts (section_id, prompt_text, display_order)
SELECT s.id, p.prompt_text, p.display_order
FROM prompt_sections s,
(VALUES
  ('The way I show love that I wish more people understood is...', 1),
  ('I feel most appreciated when...', 2),
  ('I''ve learned that I need someone who...', 3),
  ('The thing I bring to a relationship that I''m most proud of is...', 4),
  ('The green flag I look for immediately is...', 5),
  ('The dealbreaker I used to overlook but won''t anymore is...', 6),
  ('I feel most connected to someone when...', 7),
  ('The thing I want a partner to know upfront is...', 8),
  ('I''m at my best in a relationship when...', 9),
  ('A relationship has to have _____ or it won''t work for me...', 10)
) AS p(prompt_text, display_order)
WHERE s.display_order = 5;

-- Let's Have Fun (display_order = 6)
INSERT INTO prompts (section_id, prompt_text, display_order)
SELECT s.id, p.prompt_text, p.display_order
FROM prompt_sections s,
(VALUES
  ('I will absolutely destroy you at...', 1),
  ('The most random skill I have is...', 2),
  ('The fictional character I relate to most is...', 3),
  ('My karaoke song is _____ and I commit fully', 4),
  ('I take _____ way too seriously for no reason', 5),
  ('The most niche thing I find attractive is...', 6),
  ('I have an irrational fear of...', 7),
  ('The thing I will never not find funny is...', 8),
  ('If you looked at my recently played on Spotify you''d think...', 9),
  ('If my life were a movie genre it would be...', 10)
) AS p(prompt_text, display_order)
WHERE s.display_order = 6;

-- Sweat Life (display_order = 7)
INSERT INTO prompts (section_id, prompt_text, display_order)
SELECT s.id, p.prompt_text, p.display_order
FROM prompt_sections s,
(VALUES
  ('My current training focus is...', 1),
  ('The workout I''ll never skip no matter what is...', 2),
  ('I train because...', 3),
  ('The progress I''m most proud of is...', 4),
  ('The fitness goal I''m currently chasing is...', 5),
  ('I need a partner who understands that...', 6),
  ('Morning workouts or evening workouts and why...', 7),
  ('The physical challenge on my bucket list is...', 8),
  ('My biggest gym pet peeve is...', 9),
  ('The sport or activity I wish I''d started sooner is...', 10)
) AS p(prompt_text, display_order)
WHERE s.display_order = 7;
