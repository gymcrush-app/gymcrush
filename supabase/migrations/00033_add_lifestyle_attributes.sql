-- Add lifestyle attributes to profiles
ALTER TABLE profiles
  ADD COLUMN religion TEXT CHECK (religion IN ('Atheist','Jewish','Muslim','Christian','Catholic','Buddhist','Hindu','Sikh','Spiritual','Other')),
  ADD COLUMN alcohol TEXT CHECK (alcohol IN ('Yes','No','Sometimes')),
  ADD COLUMN smoking TEXT CHECK (smoking IN ('Yes','No','Sometimes')),
  ADD COLUMN marijuana TEXT CHECK (marijuana IN ('Yes','No','Sometimes')),
  ADD COLUMN has_kids TEXT CHECK (has_kids IN ('Yes','No'));
