-- Debug: Check if your user_id matches
-- Run this while logged in to see what's happening

-- 1. Check what auth.uid() returns (should be your user ID)
SELECT auth.uid() as "Current Auth UID";

-- 2. Check all records in council_admins
SELECT 
  id,
  user_id,
  role,
  council_id,
  created_at
FROM council_admins;

-- 3. Check if your auth UID matches any user_id in council_admins
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM council_admins 
      WHERE user_id = auth.uid()
    ) THEN 'MATCH FOUND ✓'
    ELSE 'NO MATCH ✗'
  END as "Auth UID Match Status";

-- 4. Check for UUID format issues
SELECT 
  ca.user_id as "DB User ID",
  auth.uid() as "Auth UID",
  ca.user_id = auth.uid() as "UUIDs Match?",
  ca.user_id::text = auth.uid()::text as "UUIDs Match (as text)?",
  pg_typeof(ca.user_id) as "DB Type",
  pg_typeof(auth.uid()) as "Auth Type"
FROM council_admins ca
LIMIT 1;

-- If this shows "NO MATCH", your user_id in council_admins 
-- doesn't match the logged-in user's auth.uid()

