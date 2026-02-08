-- Diagnostic: Check your existing table structure
-- Run this FIRST to see what structure your tables use

-- ============================================================================
-- Check the structure of an existing table (camp_campers or camp_registered_users)
-- ============================================================================

SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'camp_registered_users'
   OR table_name = 'camp_campers'
ORDER BY table_name, ordinal_position;

-- ============================================================================
-- Also check what data looks like
-- ============================================================================

SELECT * FROM camp_registered_users LIMIT 1;

-- ============================================================================
-- NEXT STEPS:
-- After running this, share the results with me so I can create
-- the exact SQL needed to match your table structure.
-- ============================================================================
