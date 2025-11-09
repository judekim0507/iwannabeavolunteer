# Migration Checklist

Use this to track your progress migrating to the multi-council system.

## Pre-Migration

- [ ] **Backup your database** (optional but recommended)
- [ ] Read through `SETUP_GUIDE.md`
- [ ] Have your Supabase dashboard open

## Database Setup

- [ ] Run `supabase-migration.sql` in Supabase SQL Editor
- [ ] Verify tables created: `councils`, `council_admins`
- [ ] Verify `council_id` column added to `events`
- [ ] Check RLS policies are active (should see them in Dashboard → Database → Policies)

## Authentication Setup

- [ ] Enable Email Auth in Supabase Dashboard → Authentication → Providers
- [ ] (Optional) Disable email confirmation for easier testing
- [ ] Create your superuser account in Dashboard → Authentication → Users
- [ ] Insert superuser record in `council_admins` table (see SETUP_GUIDE.md)
- [ ] Test login at `/admin` with superuser credentials

## Council Setup

- [ ] Login as superuser and click "Manage Councils"
- [ ] Create your first council (e.g., "Grade 9 Council")
- [ ] Create admin account for that council
- [ ] Test login with council admin account (logout first, then login)
- [ ] Verify council admin only sees their council's section

## Migrate Existing Data

If you have existing events:

- [ ] Run SQL to assign existing events to a council:

```sql
UPDATE events
SET council_id = (SELECT id FROM councils WHERE name = 'YOUR_COUNCIL_NAME' LIMIT 1)
WHERE council_id IS NULL;
```

- [ ] Verify events show up in admin panel
- [ ] Verify volunteers are still linked to events

## Test Participant Flow

- [ ] Visit main page (/)
- [ ] See council selector appear
- [ ] Select a council
- [ ] Verify correct events show for that council
- [ ] Submit a test volunteer registration
- [ ] Check it appears in admin panel

## Test Admin Flow

### As Council Admin:

- [ ] Login with council admin account
- [ ] Create a new event
- [ ] Activate the event
- [ ] Check it appears on main page for that council
- [ ] Deactivate the event
- [ ] Edit event details
- [ ] View volunteers list
- [ ] Copy volunteer names
- [ ] Delete test event

### As Superuser:

- [ ] Login with superuser account
- [ ] See "Manage Councils" button
- [ ] Create a second test council
- [ ] Create admin account for second council
- [ ] Create events for different councils
- [ ] Verify you can see ALL events from ALL councils
- [ ] Switch between councils on main page
- [ ] Verify events filter correctly

## Cleanup

- [ ] Delete test events
- [ ] Delete test councils (if any)
- [ ] Delete test admin accounts (if any)
- [ ] Remove old password environment variable (`PUBLIC_PASSWORD_ENCRYPTED`) from `.env` if it exists

## Production Checklist

Before rolling out to other councils:

- [ ] Create real councils with proper names
- [ ] Create admin accounts with strong passwords
- [ ] Share login credentials securely with each council
- [ ] Test with real users
- [ ] Monitor Supabase logs for any errors
- [ ] Set up email confirmation if desired

## Rollback (If Needed)

If something goes wrong and you need to rollback:

1. Restore database backup
2. Revert code changes:

```bash
git checkout HEAD~1 src/
```

3. Restart dev server

## Notes

- Keep track of all council admin emails/passwords
- Superuser credentials should be kept secure
- Each council needs their own unique email
- You can always create more councils later
- Events can't be transferred between councils (delete and recreate if needed)

---

**Status**: □ Not Started | ◐ In Progress | ✓ Complete

Once everything is checked off, you're good to go! 🚀
