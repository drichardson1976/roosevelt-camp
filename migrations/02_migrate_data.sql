-- Migration: Migrate users from camp_registered_users to new split tables
-- Date: 2026-02-07
-- Version: 12.172
-- IMPORTANT: Run this AFTER running 01_create_new_tables.sql

-- ============================================================================
-- STEP 1: Backup existing data (CRITICAL - DO NOT SKIP)
-- ============================================================================
-- Before running migration, export current camp_registered_users data:
-- SELECT * FROM camp_registered_users WHERE name = 'main';
-- Save this output as a backup file

-- ============================================================================
-- STEP 2: Extract and migrate PARENT users
-- ============================================================================
DO $$
DECLARE
    registered_users_data JSONB;
    parent_users JSONB;
BEGIN
    -- Get current users from camp_registered_users
    SELECT data INTO registered_users_data
    FROM camp_registered_users
    WHERE name = 'main'
    LIMIT 1;

    -- Extract only parent users (role = 'parent' OR 'parent' in roles array)
    SELECT jsonb_agg(user_data)
    INTO parent_users
    FROM jsonb_array_elements(registered_users_data) AS user_data
    WHERE
        (user_data->>'role' = 'parent')
        OR
        (user_data->'roles' @> '["parent"]'::jsonb);

    -- Update camp_parents with parent users
    IF parent_users IS NOT NULL THEN
        UPDATE camp_parents
        SET
            data = parent_users,
            updated_at = NOW()
        WHERE name = 'main';

        RAISE NOTICE 'Migrated % parent users to camp_parents', jsonb_array_length(parent_users);
    ELSE
        RAISE NOTICE 'No parent users found to migrate';
    END IF;
END $$;

-- ============================================================================
-- STEP 3: Extract and migrate COUNSELOR users
-- ============================================================================
DO $$
DECLARE
    registered_users_data JSONB;
    counselor_users JSONB;
BEGIN
    -- Get current users from camp_registered_users
    SELECT data INTO registered_users_data
    FROM camp_registered_users
    WHERE name = 'main'
    LIMIT 1;

    -- Extract only counselor users (role = 'counselor' OR 'counselor' in roles array)
    SELECT jsonb_agg(user_data)
    INTO counselor_users
    FROM jsonb_array_elements(registered_users_data) AS user_data
    WHERE
        (user_data->>'role' = 'counselor')
        OR
        (user_data->'roles' @> '["counselor"]'::jsonb);

    -- Update camp_counselor_users with counselor users
    IF counselor_users IS NOT NULL THEN
        UPDATE camp_counselor_users
        SET
            data = counselor_users,
            updated_at = NOW()
        WHERE name = 'main';

        RAISE NOTICE 'Migrated % counselor users to camp_counselor_users', jsonb_array_length(counselor_users);
    ELSE
        RAISE NOTICE 'No counselor users found to migrate';
    END IF;
END $$;

-- ============================================================================
-- STEP 4: Extract and migrate ADMIN users (if any exist in registered_users)
-- ============================================================================
DO $$
DECLARE
    registered_users_data JSONB;
    admin_users JSONB;
    existing_admins JSONB;
BEGIN
    -- Get current users from camp_registered_users
    SELECT data INTO registered_users_data
    FROM camp_registered_users
    WHERE name = 'main'
    LIMIT 1;

    -- Get existing admins
    SELECT data INTO existing_admins
    FROM camp_admins
    WHERE name = 'main'
    LIMIT 1;

    -- Extract admin users (role = 'admin' OR 'admin' in roles array)
    SELECT jsonb_agg(user_data)
    INTO admin_users
    FROM jsonb_array_elements(registered_users_data) AS user_data
    WHERE
        (user_data->>'role' = 'admin')
        OR
        (user_data->'roles' @> '["admin"]'::jsonb);

    -- Merge with existing admins if needed (don't duplicate)
    IF admin_users IS NOT NULL THEN
        -- For now, just report - don't overwrite existing admins
        RAISE NOTICE 'Found % admin users in camp_registered_users (not migrating to avoid duplicates)', jsonb_array_length(admin_users);
        RAISE NOTICE 'Admin users should already exist in camp_admins table';
    ELSE
        RAISE NOTICE 'No admin users found in camp_registered_users';
    END IF;
END $$;

-- ============================================================================
-- STEP 5: VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify migration was successful:

-- Check parent users
SELECT
    'Parents' as table_name,
    jsonb_array_length(data) as user_count,
    data
FROM camp_parents
WHERE name = 'main';

-- Check counselor users
SELECT
    'Counselor Users' as table_name,
    jsonb_array_length(data) as user_count,
    data
FROM camp_counselor_users
WHERE name = 'main';

-- Check admin users
SELECT
    'Admins' as table_name,
    jsonb_array_length(data) as user_count,
    data
FROM camp_admins
WHERE name = 'main';

-- Compare with original
SELECT
    'Original (camp_registered_users)' as table_name,
    jsonb_array_length(data) as user_count,
    data
FROM camp_registered_users
WHERE name = 'main';

-- ============================================================================
-- STEP 6: CLEANUP (OPTIONAL - DO NOT RUN UNTIL VERIFIED)
-- ============================================================================
-- After verifying migration is successful and application works:
--
-- OPTION A: Archive the old table (recommended)
-- ALTER TABLE camp_registered_users RENAME TO camp_registered_users_backup_20260207;
--
-- OPTION B: Delete the old table (not recommended until fully verified)
-- DROP TABLE camp_registered_users;
