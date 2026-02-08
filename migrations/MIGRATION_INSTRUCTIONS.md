# Database Migration: Split Users Table

**Version:** 12.172
**Date:** 2026-02-07
**Purpose:** Split `camp_registered_users` into three separate tables: `camp_parents`, `camp_counselor_users`, and `camp_admins`

## ⚠️ CRITICAL: Backup First

Before running ANY migration scripts, **backup your database**:

1. Log into Supabase Dashboard
2. Go to your project's Database section
3. Export current `camp_registered_users` table
4. Save the export file somewhere safe

## Migration Steps

### Step 1: Create New Tables

1. Open Supabase SQL Editor
2. Copy and paste the contents of `01_create_new_tables.sql`
3. Click "Run" to execute
4. Verify tables were created by running:
   ```sql
   SELECT tablename FROM pg_tables WHERE tablename LIKE 'camp_%';
   ```

Expected output should include:
- `camp_parents`
- `camp_counselor_users`
- `camp_admins`
- `camp_registered_users` (old table - still exists)

### Step 2: Migrate Data

1. **IMPORTANT:** First export your current `camp_registered_users` data as a backup:
   ```sql
   SELECT * FROM camp_registered_users WHERE name = 'main';
   ```
   Copy the JSON data and save it to a text file.

2. Copy and paste the contents of `02_migrate_data.sql` into Supabase SQL Editor
3. Click "Run" to execute
4. Review the NOTICE messages that appear - they will tell you:
   - How many parent users were migrated
   - How many counselor users were migrated
   - Whether any admin users were found

5. Run the verification queries (included at the end of `02_migrate_data.sql`):
   ```sql
   -- Check parent users
   SELECT 'Parents' as table_name, jsonb_array_length(data) as user_count
   FROM camp_parents WHERE name = 'main';

   -- Check counselor users
   SELECT 'Counselor Users' as table_name, jsonb_array_length(data) as user_count
   FROM camp_counselor_users WHERE name = 'main';

   -- Check admin users
   SELECT 'Admins' as table_name, jsonb_array_length(data) as user_count
   FROM camp_admins WHERE name = 'main';
   ```

6. Verify the counts add up correctly (parents + counselors should equal original total, assuming no admins were in camp_registered_users)

### Step 3: Test the Application

1. Refresh your application
2. Try logging in as:
   - A parent user
   - A counselor user
   - An admin user
3. Verify all data loads correctly
4. Check the Danger Zone → Supabase Table Viewer
5. Verify you see three separate user tables now

### Step 4: Verify Safety Features

1. Log in as admin
2. Go to Danger Zone
3. Click "DELETE ALL DATA (EXCEPT COUNSELORS)"
4. Verify the confirmation message says it will delete parents but NOT counselors or admins
5. **DO NOT CLICK CONFIRM** unless you actually want to delete test data

## Expected Behavior After Migration

### Authentication
- **Parents**: Log in with email/password, checked against `camp_parents` table
- **Counselors**: Log in with email/password, checked against `camp_counselor_users` table
- **Admins**: Log in with username/password, checked against `camp_admins` table

### Danger Zone Safety
- "DELETE ALL DATA" button will now delete:
  - ✅ All parents from `camp_parents`
  - ✅ All campers
  - ✅ All registrations
  - ✅ All sessions
  - ❌ **Will NOT delete counselors or admins** (preserved for safety)

### Admin Dashboard
- Danger Zone table viewer now shows three separate user tables:
  - Parents
  - Counselor Users
  - Admins

## Rollback Procedure (if needed)

If something goes wrong and you need to rollback:

1. Stop using the application immediately
2. Log into Supabase SQL Editor
3. Restore the backup data to `camp_registered_users`:
   ```sql
   UPDATE camp_registered_users
   SET data = '[YOUR BACKUP JSON DATA HERE]'::jsonb
   WHERE name = 'main';
   ```
4. Revert the code to the previous commit (before v12.171)
5. Refresh the application

## Optional: Cleanup Old Table

**ONLY do this after thoroughly testing and verifying the migration worked:**

### Option A: Archive (Recommended)
```sql
ALTER TABLE camp_registered_users
RENAME TO camp_registered_users_backup_20260207;
```

### Option B: Delete (Not recommended until fully verified)
```sql
DROP TABLE camp_registered_users;
```

## Troubleshooting

### "404 Not Found" errors for new tables
- **Cause:** Tables haven't been created yet
- **Fix:** Run Step 1 (01_create_new_tables.sql)

### "users is not defined" errors
- **Cause:** Code references that weren't updated
- **Fix:** These should be resolved by the backward compatibility layer in v12.172

### Login fails after migration
- **Cause:** User might be in wrong table or data didn't migrate
- **Fix:** Run verification queries to check which table has the user

### Counts don't match
- **Cause:** Some users might have both parent AND counselor roles
- **Fix:** Check the `roles` array in the original data - users can exist in multiple tables if they have multiple roles

## Support

If you encounter issues:
1. Check the browser console for specific error messages
2. Check Supabase logs for database errors
3. Verify all three tables exist and contain data
4. Verify RLS policies are disabled or properly configured for your tables

## Technical Details

### Table Structure
All three tables follow the same structure:
```sql
CREATE TABLE camp_[tablename] (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Data Storage
- Each table stores an array of user objects in the `data` JSONB column
- The `name` field is always 'main' for the primary data record
- User objects contain: email, name, password, phone, photo, role, roles[], etc.

### Migration Logic
- Parents: `role = 'parent'` OR `'parent' in roles[]`
- Counselors: `role = 'counselor'` OR `'counselor' in roles[]`
- Admins: `role = 'admin'` OR `'admin' in roles[]`

Users with multiple roles will be copied to multiple tables (this is intentional and correct).
