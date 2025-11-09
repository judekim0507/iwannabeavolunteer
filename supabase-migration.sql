-- Multi-Council Support Migration
-- Run this in your Supabase SQL Editor

-- 1. Create councils table
CREATE TABLE IF NOT EXISTS councils (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create council_admins table (links auth users to councils)
CREATE TABLE IF NOT EXISTS council_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  council_id UUID REFERENCES councils(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'superuser')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, council_id)
);

-- 3. Add council_id to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS council_id UUID REFERENCES councils(id) ON DELETE CASCADE;

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_council_id ON events(council_id);
CREATE INDEX IF NOT EXISTS idx_events_is_active ON events(is_active);
CREATE INDEX IF NOT EXISTS idx_council_admins_user_id ON council_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_council_admins_council_id ON council_admins(council_id);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE councils ENABLE ROW LEVEL SECURITY;
ALTER TABLE council_admins ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for councils
-- Allow everyone to read councils (for participant selection)
CREATE POLICY "Allow public read access to councils"
  ON councils FOR SELECT
  TO public
  USING (true);

-- Only superusers can create/update/delete councils
CREATE POLICY "Allow superusers to manage councils"
  ON councils FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM council_admins
      WHERE council_admins.user_id = auth.uid()
      AND council_admins.role = 'superuser'
    )
  );

-- 7. RLS Policies for events
-- Allow public read access to events (for participants)
DROP POLICY IF EXISTS "Allow public read access to events" ON events;
CREATE POLICY "Allow public read access to events"
  ON events FOR SELECT
  TO public
  USING (true);

-- Allow council admins to manage their own events
DROP POLICY IF EXISTS "Allow council admins to manage their events" ON events;
CREATE POLICY "Allow council admins to manage their events"
  ON events FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM council_admins
      WHERE council_admins.user_id = auth.uid()
      AND (
        council_admins.role = 'superuser' OR
        council_admins.council_id = events.council_id
      )
    )
  );

-- 8. RLS Policies for volunteers
-- Allow public insert for volunteers (participants)
DROP POLICY IF EXISTS "Allow public insert for volunteers" ON volunteers;
CREATE POLICY "Allow public insert for volunteers"
  ON volunteers FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow public read access to volunteers (for duplicate checking)
DROP POLICY IF EXISTS "Allow public read access to volunteers" ON volunteers;
CREATE POLICY "Allow public read access to volunteers"
  ON volunteers FOR SELECT
  TO public
  USING (true);

-- Allow council admins to manage volunteers for their events
DROP POLICY IF EXISTS "Allow council admins to manage volunteers" ON volunteers;
CREATE POLICY "Allow council admins to manage volunteers"
  ON volunteers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM council_admins
      JOIN events ON events.council_id = council_admins.council_id
      WHERE council_admins.user_id = auth.uid()
      AND events.id = volunteers.event_id
      AND (
        council_admins.role = 'superuser' OR
        council_admins.council_id = events.council_id
      )
    )
  );

-- 9. RLS Policies for council_admins
-- Allow admins to read their own admin records
CREATE POLICY "Allow admins to read their own records"
  ON council_admins FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM council_admins ca
    WHERE ca.user_id = auth.uid() AND ca.role = 'superuser'
  ));

-- Only superusers can manage council_admins
CREATE POLICY "Allow superusers to manage council_admins"
  ON council_admins FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM council_admins
      WHERE council_admins.user_id = auth.uid()
      AND council_admins.role = 'superuser'
    )
  );

-- 10. Create a default superuser helper function
-- You'll need to call this manually with your first user's ID after creating them
CREATE OR REPLACE FUNCTION create_superuser(user_email TEXT, user_password TEXT)
RETURNS TEXT AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- This function should be called by you manually in Supabase
  -- to create the first superuser account
  RETURN 'Please create the superuser manually in Supabase Auth panel, then run: INSERT INTO council_admins (user_id, role) VALUES (''<user_id>'', ''superuser'');';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Done! Next steps:
-- 1. Enable Email Auth in Supabase Dashboard > Authentication > Providers
-- 2. Create your superuser account in Supabase Dashboard > Authentication > Users
-- 3. Insert superuser record: INSERT INTO council_admins (user_id, role) VALUES ('<your-user-id>', 'superuser');
-- 4. If you have existing events, assign them to councils:
--    - First create councils: INSERT INTO councils (name) VALUES ('Grade 9 Council');
--    - Then update events: UPDATE events SET council_id = '<council-id>' WHERE council_id IS NULL;

