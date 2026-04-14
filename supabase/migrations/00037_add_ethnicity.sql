-- Add ethnicity (multi-select) to profiles
ALTER TABLE profiles
  ADD COLUMN ethnicity TEXT[] DEFAULT '{}';

-- Constrain each array element to allowed values
ALTER TABLE profiles
  ADD CONSTRAINT ethnicity_values_check
  CHECK (ethnicity <@ ARRAY[
    'Black / African Descent',
    'White / Caucasian',
    'Hispanic / Latino',
    'Asian',
    'South Asian',
    'Middle Eastern',
    'Native American',
    'Pacific Islander',
    'Other',
    'Prefer not to say'
  ]::TEXT[]);
