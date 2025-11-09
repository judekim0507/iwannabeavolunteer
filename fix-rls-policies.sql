-- Fix for RLS Policy Infinite Recursion
-- Run this in Supabase SQL Editor

-- 1. Drop all existing policies on council_admins
DROP POLICY IF EXISTS "Allow admins to read their own records" ON council_admins;
DROP POLICY IF EXISTS "Allow superusers to manage council_admins" ON council_admins;

-- 2. Create a simple, non-recursive policy for reading own records
-- This allows any authenticated user to read ONLY their own council_admin record
CREATE POLICY "Allow users to read own admin record"
  ON council_admins FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 3. Create a function to check if a user is a superuser
-- This avoids the infinite recursion by caching the result
CREATE OR REPLACE FUNCTION is_superuser()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM council_admins
    WHERE user_id = auth.uid()
    AND role = 'superuser'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 4. Create policy for superusers to manage all council_admins
-- Using INSERT, UPDATE, DELETE separately to avoid conflicts
CREATE POLICY "Superusers can insert council_admins"
  ON council_admins FOR INSERT
  TO authenticated
  WITH CHECK (is_superuser());

CREATE POLICY "Superusers can update council_admins"
  ON council_admins FOR UPDATE
  TO authenticated
  USING (is_superuser());

CREATE POLICY "Superusers can delete council_admins"
  ON council_admins FOR DELETE
  TO authenticated
  USING (is_superuser());

-- 5. Allow superusers to read ALL admin records (for the admin list)
CREATE POLICY "Superusers can read all admin records"
  ON council_admins FOR SELECT
  TO authenticated
  USING (is_superuser());

-- Done! The key changes:
-- - Separate SELECT policy for reading own record (simple, no recursion)
-- - Separate SELECT policy for superusers to read all records
-- - Function is STABLE which allows Postgres to cache it during the query
-- - SECURITY DEFINER allows the function to bypass RLS when checking

