-- ============================================================================
-- SCHEMA VERIFICATION: Check both DEV and PUBLIC schemas
-- Run this in Supabase SQL Editor to verify table structure and data
-- ============================================================================

-- ============================================================================
-- PART 1: List all tables in both schemas
-- ============================================================================

SELECT
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE schemaname IN ('dev', 'public')
    AND tablename LIKE 'camp_%'
ORDER BY schemaname, tablename;

-- Expected tables in BOTH schemas:
-- dev.camp_admins
-- dev.camp_camper_emergency_contact_links
-- dev.camp_camper_parent_links
-- dev.camp_campers
-- dev.camp_change_history
-- dev.camp_content
-- dev.camp_counselor_users (NEW)
-- dev.camp_counselors
-- dev.camp_emergency_contacts
-- dev.camp_food_photos
-- dev.camp_gym_rentals
-- dev.camp_messages
-- dev.camp_onboarding_progress
-- dev.camp_parents (NEW)
-- dev.camp_registered_users (OLD - to be migrated)
-- dev.camp_registrations
-- dev.camp_sessions
-- dev.camp_site_photos
-- public.camp_* (same list)

-- ============================================================================
-- PART 2: Check structure of new tables (DEV schema)
-- ============================================================================

SELECT
    'dev.camp_parents' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'dev'
    AND table_name = 'camp_parents'
ORDER BY ordinal_position;

SELECT
    'dev.camp_counselor_users' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'dev'
    AND table_name = 'camp_counselor_users'
ORDER BY ordinal_position;

-- Expected structure for BOTH:
-- id: text, NO, 'main'::text
-- data: jsonb, NO, (null)
-- updated_at: timestamp with time zone, YES, now()

-- ============================================================================
-- PART 3: Check structure of new tables (PUBLIC schema)
-- ============================================================================

SELECT
    'public.camp_parents' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'camp_parents'
ORDER BY ordinal_position;

SELECT
    'public.camp_counselor_users' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'camp_counselor_users'
ORDER BY ordinal_position;

-- ============================================================================
-- PART 4: Check current data in camp_registered_users (BOTH schemas)
-- ============================================================================

-- DEV schema
SELECT
    'dev.camp_registered_users' as source,
    id,
    jsonb_array_length(data) as total_users,
    jsonb_pretty(jsonb_agg(
        jsonb_build_object(
            'email', user_data->>'email',
            'name', user_data->>'name',
            'role', user_data->>'role',
            'roles', user_data->'roles'
        )
    )) as user_summary
FROM dev.camp_registered_users,
     jsonb_array_elements(data) as user_data
WHERE id = 'main'
GROUP BY id;

-- PUBLIC schema
SELECT
    'public.camp_registered_users' as source,
    id,
    jsonb_array_length(data) as total_users,
    jsonb_pretty(jsonb_agg(
        jsonb_build_object(
            'email', user_data->>'email',
            'name', user_data->>'name',
            'role', user_data->>'role',
            'roles', user_data->'roles'
        )
    )) as user_summary
FROM public.camp_registered_users,
     jsonb_array_elements(data) as user_data
WHERE id = 'main'
GROUP BY id;

-- ============================================================================
-- PART 5: Check data in new tables (BOTH schemas)
-- ============================================================================

-- DEV schema - camp_parents
SELECT
    'dev.camp_parents' as table_name,
    id,
    COALESCE(jsonb_array_length(data), 0) as user_count,
    CASE
        WHEN data IS NULL THEN 'NULL data'
        WHEN jsonb_array_length(data) = 0 THEN 'Empty array'
        ELSE jsonb_pretty(data)
    END as data_preview
FROM dev.camp_parents
WHERE id = 'main';

-- DEV schema - camp_counselor_users
SELECT
    'dev.camp_counselor_users' as table_name,
    id,
    COALESCE(jsonb_array_length(data), 0) as user_count,
    CASE
        WHEN data IS NULL THEN 'NULL data'
        WHEN jsonb_array_length(data) = 0 THEN 'Empty array'
        ELSE jsonb_pretty(data)
    END as data_preview
FROM dev.camp_counselor_users
WHERE id = 'main';

-- PUBLIC schema - camp_parents
SELECT
    'public.camp_parents' as table_name,
    id,
    COALESCE(jsonb_array_length(data), 0) as user_count,
    CASE
        WHEN data IS NULL THEN 'NULL data'
        WHEN jsonb_array_length(data) = 0 THEN 'Empty array'
        ELSE jsonb_pretty(data)
    END as data_preview
FROM public.camp_parents
WHERE id = 'main';

-- PUBLIC schema - camp_counselor_users
SELECT
    'public.camp_counselor_users' as table_name,
    id,
    COALESCE(jsonb_array_length(data), 0) as user_count,
    CASE
        WHEN data IS NULL THEN 'NULL data'
        WHEN jsonb_array_length(data) = 0 THEN 'Empty array'
        ELSE jsonb_pretty(data)
    END as data_preview
FROM public.camp_counselor_users
WHERE id = 'main';

-- ============================================================================
-- PART 6: User count breakdown by role (DEV schema)
-- ============================================================================

SELECT
    'DEV Schema' as schema_name,
    COUNT(*) FILTER (WHERE user_data->>'role' = 'parent' OR user_data->'roles' @> '["parent"]'::jsonb) as parent_count,
    COUNT(*) FILTER (WHERE user_data->>'role' = 'counselor' OR user_data->'roles' @> '["counselor"]'::jsonb) as counselor_count,
    COUNT(*) FILTER (WHERE user_data->>'role' = 'admin' OR user_data->'roles' @> '["admin"]'::jsonb) as admin_count,
    COUNT(*) as total_count
FROM dev.camp_registered_users,
     jsonb_array_elements(data) as user_data
WHERE id = 'main';

-- ============================================================================
-- PART 7: User count breakdown by role (PUBLIC schema)
-- ============================================================================

SELECT
    'PUBLIC Schema' as schema_name,
    COUNT(*) FILTER (WHERE user_data->>'role' = 'parent' OR user_data->'roles' @> '["parent"]'::jsonb) as parent_count,
    COUNT(*) FILTER (WHERE user_data->>'role' = 'counselor' OR user_data->'roles' @> '["counselor"]'::jsonb) as counselor_count,
    COUNT(*) FILTER (WHERE user_data->>'role' = 'admin' OR user_data->'roles' @> '["admin"]'::jsonb) as admin_count,
    COUNT(*) as total_count
FROM public.camp_registered_users,
     jsonb_array_elements(data) as user_data
WHERE id = 'main';

-- ============================================================================
-- PART 8: Migration readiness check
-- ============================================================================

SELECT
    'Migration Status Summary' as report_type,
    (SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'dev' AND table_name = 'camp_parents')) as dev_parents_exists,
    (SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'dev' AND table_name = 'camp_counselor_users')) as dev_counselor_users_exists,
    (SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'camp_parents')) as public_parents_exists,
    (SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'camp_counselor_users')) as public_counselor_users_exists,
    (SELECT COALESCE(jsonb_array_length(data), 0) FROM dev.camp_parents WHERE id = 'main') as dev_parents_count,
    (SELECT COALESCE(jsonb_array_length(data), 0) FROM dev.camp_counselor_users WHERE id = 'main') as dev_counselors_count,
    (SELECT COALESCE(jsonb_array_length(data), 0) FROM public.camp_parents WHERE id = 'main') as public_parents_count,
    (SELECT COALESCE(jsonb_array_length(data), 0) FROM public.camp_counselor_users WHERE id = 'main') as public_counselors_count;

-- ============================================================================
-- INTERPRETATION GUIDE
-- ============================================================================

-- If tables exist but counts are 0:
--   → Tables created successfully, but migration hasn't been run yet
--   → Safe to run migrations/02_migrate_data_CORRECT.sql

-- If counts > 0 in new tables:
--   → Migration already completed
--   → Compare counts with camp_registered_users to verify nothing lost

-- If tables don't exist:
--   → Run migrations/01_create_new_tables_CORRECT.sql first

-- Expected after full migration:
--   dev_parents_count + dev_counselors_count = total users in dev.camp_registered_users
--   public_parents_count + public_counselors_count = total users in public.camp_registered_users
