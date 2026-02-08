-- ============================================================================
-- DELETE UNUSED TABLES - Final Database Cleanup
-- Date: 2026-02-08
-- Purpose: Remove all unused and legacy tables from both schemas
-- ============================================================================

-- ============================================================================
-- SAFETY CHECK: Verify tables exist before deletion
-- ============================================================================

SELECT 'TABLES TO BE DELETED:' as notice;

SELECT
    schemaname as schema,
    tablename as table_name,
    'LEGACY - Replaced by camp_parents + camp_counselor_users' as reason
FROM pg_tables
WHERE tablename = 'camp_registered_users'
    AND schemaname IN ('dev', 'public')
UNION ALL
SELECT
    schemaname,
    tablename,
    'LEGACY - Replaced by camp_camper_parent_links' as reason
FROM pg_tables
WHERE tablename = 'camp_child_parent_links'
    AND schemaname IN ('dev', 'public')
UNION ALL
SELECT
    schemaname,
    tablename,
    'LEGACY - Replaced by camp_campers' as reason
FROM pg_tables
WHERE tablename = 'camp_children'
    AND schemaname IN ('dev', 'public')
UNION ALL
SELECT
    schemaname,
    tablename,
    'UNUSED - Zero code references' as reason
FROM pg_tables
WHERE tablename IN ('guest_requests', 'players', 'runs', 'status_history', 'camp_referrals')
    AND schemaname IN ('dev', 'public')
ORDER BY schema, table_name;

-- ============================================================================
-- OPTIONAL: BACKUP DATA (Run before deletion if you want to save the data)
-- ============================================================================

-- Uncomment these lines to backup data before deletion:
/*
-- Backup camp_registered_users
SELECT 'BACKUP: camp_registered_users (DEV)' as backup_notice;
SELECT * FROM dev.camp_registered_users;

SELECT 'BACKUP: camp_registered_users (PUBLIC)' as backup_notice;
SELECT * FROM public.camp_registered_users;

-- Backup camp_child_parent_links
SELECT 'BACKUP: camp_child_parent_links (DEV)' as backup_notice;
SELECT * FROM dev.camp_child_parent_links;

SELECT 'BACKUP: camp_child_parent_links (PUBLIC)' as backup_notice;
SELECT * FROM public.camp_child_parent_links;

-- Backup camp_children
SELECT 'BACKUP: camp_children (DEV)' as backup_notice;
SELECT * FROM dev.camp_children;

SELECT 'BACKUP: camp_children (PUBLIC)' as backup_notice;
SELECT * FROM public.camp_children;

-- Note: Other tables (guest_requests, players, runs, status_history, camp_referrals)
-- were never used in the code, so likely have no data worth backing up
*/

-- ============================================================================
-- DELETION: Remove unused tables from DEV schema
-- ============================================================================

-- Legacy tables (replaced by new tables)
DROP TABLE IF EXISTS dev.camp_registered_users CASCADE;
DROP TABLE IF EXISTS dev.camp_child_parent_links CASCADE;
DROP TABLE IF EXISTS dev.camp_children CASCADE;

-- Unused system tables (never referenced in code)
DROP TABLE IF EXISTS dev.guest_requests CASCADE;
DROP TABLE IF EXISTS dev.players CASCADE;
DROP TABLE IF EXISTS dev.runs CASCADE;
DROP TABLE IF EXISTS dev.status_history CASCADE;
DROP TABLE IF EXISTS dev.camp_referrals CASCADE;

SELECT 'DEV schema: Deleted 8 unused tables' as notice;

-- ============================================================================
-- DELETION: Remove unused tables from PUBLIC schema
-- ============================================================================

-- Legacy tables (replaced by new tables)
DROP TABLE IF EXISTS public.camp_registered_users CASCADE;
DROP TABLE IF EXISTS public.camp_child_parent_links CASCADE;
DROP TABLE IF EXISTS public.camp_children CASCADE;

-- Unused system table (the others don't exist in PUBLIC)
DROP TABLE IF EXISTS public.camp_referrals CASCADE;

SELECT 'PUBLIC schema: Deleted 4 unused tables' as notice;

-- ============================================================================
-- VERIFICATION: List all remaining tables in both schemas
-- ============================================================================

SELECT '========================================' as divider;
SELECT 'VERIFICATION: Remaining Tables' as notice;
SELECT '========================================' as divider;

-- Count tables in each schema
SELECT
    'DEV' as schema,
    COUNT(*) as table_count,
    'Expected: 23' as expected
FROM pg_tables
WHERE schemaname = 'dev'
    AND tablename LIKE 'camp_%'
UNION ALL
SELECT
    'PUBLIC' as schema,
    COUNT(*) as table_count,
    'Expected: 24 (includes camp_camper_emergency_contact_links)' as expected
FROM pg_tables
WHERE schemaname = 'public'
    AND (tablename LIKE 'camp_%' OR tablename IN ('guest_requests', 'players', 'runs', 'status_history'));

-- List all remaining tables in DEV schema
SELECT '========================================' as divider;
SELECT 'DEV SCHEMA - Final Tables (23 expected):' as notice;
SELECT '========================================' as divider;

SELECT
    tablename as table_name,
    'Active' as status
FROM pg_tables
WHERE schemaname = 'dev'
    AND tablename LIKE 'camp_%'
ORDER BY tablename;

-- List all remaining tables in PUBLIC schema
SELECT '========================================' as divider;
SELECT 'PUBLIC SCHEMA - Final Tables (24 expected):' as notice;
SELECT '========================================' as divider;

SELECT
    tablename as table_name,
    'Active' as status
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename LIKE 'camp_%'
ORDER BY tablename;

-- ============================================================================
-- VERIFICATION: Expected Final State
-- ============================================================================

SELECT '========================================' as divider;
SELECT 'EXPECTED TABLES (should match above):' as notice;
SELECT '========================================' as divider;

SELECT 'Expected Tables in BOTH schemas (23 tables):' as notice
UNION ALL
SELECT '  1. camp_admins'
UNION ALL
SELECT '  2. camp_assignments'
UNION ALL
SELECT '  3. camp_availability_change_requests'
UNION ALL
SELECT '  4. camp_blocked_sessions'
UNION ALL
SELECT '  5. camp_camper_parent_links'
UNION ALL
SELECT '  6. camp_campers'
UNION ALL
SELECT '  7. camp_change_history'
UNION ALL
SELECT '  8. camp_content'
UNION ALL
SELECT '  9. camp_counselor_availability'
UNION ALL
SELECT ' 10. camp_counselor_schedule'
UNION ALL
SELECT ' 11. camp_counselor_users'
UNION ALL
SELECT ' 12. camp_counselors'
UNION ALL
SELECT ' 13. camp_dates'
UNION ALL
SELECT ' 14. camp_emergency_contacts'
UNION ALL
SELECT ' 15. camp_food_photos'
UNION ALL
SELECT ' 16. camp_gym_rentals'
UNION ALL
SELECT ' 17. camp_messages'
UNION ALL
SELECT ' 18. camp_onboarding_progress'
UNION ALL
SELECT ' 19. camp_parents'
UNION ALL
SELECT ' 20. camp_profile_change_requests'
UNION ALL
SELECT ' 21. camp_registrations'
UNION ALL
SELECT ' 22. camp_site_photos'
UNION ALL
SELECT ' 23. camp_sessions'
UNION ALL
SELECT ''
UNION ALL
SELECT 'Expected in PUBLIC schema ONLY (1 additional table):'
UNION ALL
SELECT ' 24. camp_camper_emergency_contact_links'
UNION ALL
SELECT ''
UNION ALL
SELECT 'DELETED Tables (should NOT appear above):'
UNION ALL
SELECT '  ✗ camp_registered_users (legacy)'
UNION ALL
SELECT '  ✗ camp_child_parent_links (legacy)'
UNION ALL
SELECT '  ✗ camp_children (legacy)'
UNION ALL
SELECT '  ✗ guest_requests (unused)'
UNION ALL
SELECT '  ✗ players (unused)'
UNION ALL
SELECT '  ✗ runs (unused)'
UNION ALL
SELECT '  ✗ status_history (unused)'
UNION ALL
SELECT '  ✗ camp_referrals (unused)';

-- ============================================================================
-- VERIFICATION: Confirm deletions were successful
-- ============================================================================

SELECT '========================================' as divider;
SELECT 'DELETION CONFIRMATION:' as notice;
SELECT '========================================' as divider;

-- Check that deleted tables no longer exist
SELECT
    CASE
        WHEN NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'camp_registered_users' AND schemaname IN ('dev', 'public'))
        THEN '✓ camp_registered_users deleted from both schemas'
        ELSE '✗ ERROR: camp_registered_users still exists!'
    END as status
UNION ALL
SELECT
    CASE
        WHEN NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'camp_child_parent_links' AND schemaname IN ('dev', 'public'))
        THEN '✓ camp_child_parent_links deleted from both schemas'
        ELSE '✗ ERROR: camp_child_parent_links still exists!'
    END
UNION ALL
SELECT
    CASE
        WHEN NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'camp_children' AND schemaname IN ('dev', 'public'))
        THEN '✓ camp_children deleted from both schemas'
        ELSE '✗ ERROR: camp_children still exists!'
    END
UNION ALL
SELECT
    CASE
        WHEN NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'guest_requests' AND schemaname = 'dev')
        THEN '✓ guest_requests deleted from DEV'
        ELSE '✗ ERROR: guest_requests still exists in DEV!'
    END
UNION ALL
SELECT
    CASE
        WHEN NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'players' AND schemaname = 'dev')
        THEN '✓ players deleted from DEV'
        ELSE '✗ ERROR: players still exists in DEV!'
    END
UNION ALL
SELECT
    CASE
        WHEN NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'runs' AND schemaname = 'dev')
        THEN '✓ runs deleted from DEV'
        ELSE '✗ ERROR: runs still exists in DEV!'
    END
UNION ALL
SELECT
    CASE
        WHEN NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'status_history' AND schemaname = 'dev')
        THEN '✓ status_history deleted from DEV'
        ELSE '✗ ERROR: status_history still exists in DEV!'
    END
UNION ALL
SELECT
    CASE
        WHEN NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'camp_referrals' AND schemaname IN ('dev', 'public'))
        THEN '✓ camp_referrals deleted from both schemas'
        ELSE '✗ ERROR: camp_referrals still exists!'
    END;

-- ============================================================================
-- FINAL SUMMARY
-- ============================================================================

SELECT '========================================' as divider;
SELECT 'CLEANUP COMPLETE!' as notice;
SELECT '========================================' as divider;

SELECT
    'Total tables deleted: 8 (DEV) + 4 (PUBLIC) = 12' as summary
UNION ALL
SELECT
    'Final table count: 23 (DEV) + 24 (PUBLIC) = 47' as summary
UNION ALL
SELECT
    'Storage reduction: ~25% fewer tables' as summary
UNION ALL
SELECT
    'All remaining tables are actively used in application code' as summary;

-- ============================================================================
-- NEXT STEPS
-- ============================================================================

SELECT '========================================' as divider;
SELECT 'NEXT STEPS:' as notice;
SELECT '========================================' as divider;

SELECT '1. Verify table counts match expected (23 DEV, 24 PUBLIC)' as step
UNION ALL
SELECT '2. Review table lists above to ensure all expected tables present' as step
UNION ALL
SELECT '3. Test application in both DEV and PUBLIC environments' as step
UNION ALL
SELECT '4. Remove deleted tables from admin.html Danger Zone section' as step
UNION ALL
SELECT '5. Update CLAUDE.md to reflect camp_registered_users has been deleted' as step;
