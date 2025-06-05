-- Make old timing columns nullable
ALTER TABLE breakfast_competitions
ALTER COLUMN start_time DROP NOT NULL,
ALTER COLUMN end_time DROP NOT NULL;

-- Add new time-related columns to breakfast_competitions table
ALTER TABLE breakfast_competitions
ADD COLUMN registration_start_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN competition_start_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN competition_end_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN voting_start_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN voting_end_time TIMESTAMP WITH TIME ZONE;

-- Update the create_breakfast_competition function
CREATE OR REPLACE FUNCTION create_breakfast_competition(
  registration_start_time TIMESTAMP WITH TIME ZONE,
  competition_start_time TIMESTAMP WITH TIME ZONE,
  competition_end_time TIMESTAMP WITH TIME ZONE,
  voting_start_time TIMESTAMP WITH TIME ZONE,
  voting_end_time TIMESTAMP WITH TIME ZONE,
  theme TEXT,
  competition_number INTEGER,
  week_number INTEGER,
  year INTEGER
) RETURNS UUID AS $$
DECLARE
  new_competition_id UUID;
BEGIN
  -- Create new competition
  INSERT INTO breakfast_competitions (
    registration_start_time,
    competition_start_time,
    competition_end_time,
    voting_start_time,
    voting_end_time,
    theme,
    competition_number,
    week_number,
    year,
    status
  ) VALUES (
    registration_start_time,
    competition_start_time,
    competition_end_time,
    voting_start_time,
    voting_end_time,
    theme,
    competition_number,
    week_number,
    year,
    'active'
  ) RETURNING id INTO new_competition_id;

  RETURN new_competition_id;
END;
$$ LANGUAGE plpgsql;

-- Example SQL to create a test competition with 5-minute phases
INSERT INTO breakfast_competitions (
  start_time, -- Add these for backward compatibility
  end_time,   -- Add these for backward compatibility
  registration_start_time,
  competition_start_time,
  competition_end_time,
  voting_start_time,
  voting_end_time,
  status,
  theme,
  competition_number,
  week_number,
  year
) VALUES (
  NOW(), -- start_time
  NOW() + interval '14 minutes', -- end_time (same as voting_end_time)
  NOW(), -- registration starts now
  NOW() + interval '5 minutes', -- competition starts in 5 minutes
  NOW() + interval '9 minutes', -- competition ends in 9 minutes (4 hours compressed to 4 minutes)
  NOW() + interval '9 minutes', -- voting starts when competition ends
  NOW() + interval '14 minutes', -- voting ends in 14 minutes (1 day compressed to 5 minutes)
  'active',
  'Test Breakfast Competition',
  1,
  EXTRACT(WEEK FROM NOW()),
  EXTRACT(YEAR FROM NOW())
); 