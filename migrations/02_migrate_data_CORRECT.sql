-- Migration: Migrate users from camp_registered_users to new split tables
-- Date: 2026-02-07
-- Version: 12.175 (CORRECTED for your actual structure)
-- IMPORTANT: Run AFTER running 01_create_new_tables_CORRECT.sql

-- ============================================================================
-- STEP 1: BACKUP (CRITICAL - DO NOT SKIP)
-- ============================================================================
-- Before running migration, backup current data:
-- SELECT * FROM camp_registered_users WHERE id = 'main';
-- Copy and save the output!

-- ============================================================================
-- STEP 2: Migrate PARENT users to camp_parents
-- ============================================================================
DO $$
DECLARE
    registered_users_data JSONB;
    parent_users JSONB;
BEGIN
    -- Get current users from camp_registered_users
    SELECT data INTO registered_users_data
    FROM camp_registered_users
    WHERE id = 'main'
    LIMIT 1;

    IF registered_users_data IS NULL THEN
        RAISE NOTICE 'No data found in camp_registered_users';
        RETURN;
    END IF;

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
        WHERE id = 'main';

        RAISE NOTICE 'Migrated % parent users to camp_parents', jsonb_array_length(parent_users);
    ELSE
        RAISE NOTICE 'No parent users found to migrate';
        -- Set empty array if no parents
        UPDATE camp_parents
        SET data = '[]'::jsonb, updated_at = NOW()
        WHERE id = 'main';
    END IF;
END $$;

-- ============================================================================
-- STEP 3: Migrate COUNSELOR users to camp_counselor_users
-- ============================================================================
DO $$
DECLARE
    registered_users_data JSONB;
    counselor_users JSONB;
BEGIN
    -- Get current users from camp_registered_users
    SELECT data INTO registered_users_data
    FROM camp_registered_users
    WHERE id = 'main'
    LIMIT 1;

    IF registered_users_data IS NULL THEN
        RAISE NOTICE 'No data found in camp_registered_users';
        RETURN;
    END IF;

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
        WHERE id = 'main';

        RAISE NOTICE 'Migrated % counselor users to camp_counselor_users', jsonb_array_length(counselor_users);
    ELSE
        RAISE NOTICE 'No counselor users found to migrate';
        -- Set empty array if no counselors
        UPDATE camp_counselor_users
        SET data = '[]'::jsonb, updated_at = NOW()
        WHERE id = 'main';
    END IF;
END $$;

-- ============================================================================
-- STEP 4: Check for ADMIN users (informational only)
-- ============================================================================
DO $$
DECLARE
    registered_users_data JSONB;
    admin_users JSONB;
BEGIN
    -- Get current users from camp_registered_users
    SELECT data INTO registered_users_data
    FROM camp_registered_users
    WHERE id = 'main'
    LIMIT 1;

    IF registered_users_data IS NULL THEN
        RETURN;
    END IF;

    -- Extract admin users (role = 'admin' OR 'admin' in roles array)
    SELECT jsonb_agg(user_data)
    INTO admin_users
    FROM jsonb_array_elements(registered_users_data) AS user_data
    WHERE
        (user_data->>'role' = 'admin')
        OR
        (user_data->'roles' @> '["admin"]'::jsonb);

    -- Just report - don't migrate (admins should already be in camp_admins)
    IF admin_users IS NOT NULL THEN
        RAISE NOTICE 'Found % admin users in camp_registered_users (not migrating - should already exist in camp_admins)', jsonb_array_length(admin_users);
    ELSE
        RAISE NOTICE 'No admin users found in camp_registered_users (this is normal)';
    END IF;
END $$;

-- ============================================================================
-- STEP 5: VERIFICATION QUERIES
-- ============================================================================

-- Show the results of migration
SELECT
    'Parents' as table_name,
    jsonb_array_length(data) as user_count,
    jsonb_pretty(data) as sample_data
FROM camp_parents
WHERE id = 'main';

SELECT
    'Counselor Users' as table_name,
    jsonb_array_length(data) as user_count,
    jsonb_pretty(data) as sample_data
FROM camp_counselor_users
WHERE id = 'main';

SELECT
    'Admins' as table_name,
    jsonb_array_length(data) as user_count,
    jsonb_pretty(data) as sample_data
FROM camp_admins
WHERE id = 'main';

-- Compare with original (should equal parents + counselors)
SELECT
    'Original (camp_registered_users)' as table_name,
    jsonb_array_length(data) as user_count,
    data as sample_data
FROM camp_registered_users
WHERE id = 'main';

-- Summary counts
SELECT
    (SELECT jsonb_array_length(data) FROM camp_parents WHERE id = 'main') as parents_count,
    (SELECT jsonb_array_length(data) FROM camp_counselor_users WHERE id = 'main') as counselors_count,
    (SELECT jsonb_array_length(data) FROM camp_admins WHERE id = 'main') as admins_count,
    (SELECT jsonb_array_length(data) FROM camp_registered_users WHERE id = 'main') as original_count;

-- ============================================================================
-- STEP 6: CLEANUP (DO NOT RUN UNTIL FULLY VERIFIED!)
-- ============================================================================
-- After verifying migration is successful and app works correctly:
--
-- OPTION A: Archive the old table (recommended)
-- ALTER TABLE camp_registered_users RENAME TO camp_registered_users_backup_20260207;
--
-- OPTION B: Delete the old table (not recommended until thoroughly tested)
-- DROP TABLE camp_registered_users;
