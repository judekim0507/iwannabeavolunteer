# Multi-Council Setup Guide

## What Changed?

Your app now supports **multiple councils**! Each council can:

- Have their own admin account with email/password
- Create and manage their own events
- See only their volunteers

Plus, there's a **superuser account** that can:

- Create new councils
- Create admin accounts for councils
- Manage everything across all councils

## Setup Steps

### 0. Environment Variables

Add these to your `.env` file:

```
PUBLIC_SUPABASE_URL=your_supabase_project_url
PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

**Where to find these:**

- Supabase Dashboard → Settings → API
- `URL` → `PUBLIC_SUPABASE_URL`
- `anon/public` key → `PUBLIC_SUPABASE_ANON_KEY`
- `service_role` key (secret!) → `SUPABASE_SERVICE_ROLE_KEY`

⚠️ **IMPORTANT**: The service role key is powerful - **NEVER** commit it to git or expose it client-side!

### 1. Run the Database Migration

1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Copy and paste the contents of `supabase-migration.sql`
4. Click **Run**

This will create:

- `councils` table
- `council_admins` table
- Add `council_id` to events
- Set up all the security policies

### 2. Enable Email Authentication

1. In Supabase Dashboard, go to **Authentication** → **Providers**
2. Make sure **Email** is enabled
3. (Optional) Disable email confirmation if you want instant access:
   - Go to **Authentication** → **Settings**
   - Turn off "Enable email confirmations"

### 3. Create Your Superuser Account

#### Option A: Using Supabase Dashboard (Easiest)

1. Go to **Authentication** → **Users**
2. Click **Add User** (or **Invite**)
3. Enter your superuser email and password
4. Copy the User ID that's created
5. Go to **SQL Editor** and run:

```sql
INSERT INTO council_admins (user_id, role)
VALUES ('YOUR-USER-ID-HERE', 'superuser');
```

#### Option B: Using SQL (All in One)

If you want to do it all in SQL:

```sql
-- Note: You'll need to use the Supabase Dashboard to create the auth user first,
-- then get the user_id from the auth.users table and insert it here:
INSERT INTO council_admins (user_id, role)
SELECT id, 'superuser'
FROM auth.users
WHERE email = 'your-superuser-email@example.com';
```

### 4. Create Your First Councils

1. Login to `/admin` with your superuser account
2. Click **Manage Councils**
3. Create councils:
   - Grade 9 Council
   - Grade 10 Council
   - etc.
4. For each council, create an admin account:
   - Email: `grade9@council.com` (or whatever you want)
   - Password: (something secure)
   - Select the council

### 5. Migrate Existing Events (If You Have Any)

If you have existing events in the database, you need to assign them to councils:

```sql
-- First, create a council if you haven't already
INSERT INTO councils (name) VALUES ('Grade 9 Council');

-- Then, update all events to belong to this council
UPDATE events
SET council_id = (SELECT id FROM councils WHERE name = 'Grade 9 Council' LIMIT 1)
WHERE council_id IS NULL;
```

## How It Works Now

### For Participants (Main Page)

1. When they visit the site, they see a **council selector** at the top
2. They pick their council (e.g., "Grade 9 Council")
3. They only see active events for that council
4. Their selection is saved in localStorage

### For Council Admins

1. Login at `/admin` with their email/password
2. They see **only their council's events**
3. They can:
   - Create new events (automatically assigned to their council)
   - Activate/deactivate events
   - View volunteers
   - Copy volunteer names
   - Edit/delete events

### For Superuser (You)

1. Login at `/admin` with your superuser account
2. Click **Manage Councils** to:
   - Create new councils
   - Create admin accounts for councils
   - Delete councils
   - View all admins
3. When creating events, you **must select a council**
4. You can see **all events from all councils**

## Important Notes

### Security

- RLS (Row Level Security) is enabled on all tables
- Council admins can only see/edit their own council's data
- Superusers can see/edit everything
- Participants can view all councils and events (read-only)

### Council vs Party

In the code, I use "council" but you mentioned "party" - they're the same thing. Each school council/party gets their own space in the app.

### Admin Auth

- The old password-based auth is **removed**
- All admin login now uses **Supabase Auth** (email + password)
- Each council has their own email/password combo
- No way for councils to create their own accounts (you control this as superuser)

### Testing

1. Create 2-3 test councils
2. Create admin accounts for each
3. Login as each admin and create test events
4. Visit the main page and switch between councils to see different events

## Troubleshooting

### "You don't have admin access"

- Your user account doesn't have a `council_admins` record
- Run this SQL to check:

```sql
SELECT * FROM council_admins WHERE user_id = 'YOUR-USER-ID';
```

### "Failed to load events"

- Make sure you ran the migration SQL
- Check that RLS policies are enabled:

```sql
SELECT tablename, policyname
FROM pg_policies
WHERE tablename IN ('events', 'councils', 'council_admins');
```

### Existing events not showing

- They need a `council_id`
- Run the migration SQL from Step 5 above

### Can't create admin accounts

- Make sure you're logged in as superuser
- Check that `supabase.auth.admin` functions are available
- You might need to enable Service Role Key in your Supabase settings

## What Files Changed?

- `src/lib/supabase.ts` - Added Council and CouncilAdmin types
- `src/routes/+page.svelte` - Added council selector for participants
- `src/routes/admin/+page.svelte` - Complete rewrite with Supabase Auth
- `supabase-migration.sql` - New database schema
- Deleted: `src/routes/admin/login/+server.ts` (old password auth)

## Need Help?

If something's not working:

1. Check the browser console for errors
2. Check Supabase logs in the Dashboard
3. Make sure all migrations ran successfully
4. Verify your superuser account is in `council_admins` table

Good luck! 🍀
