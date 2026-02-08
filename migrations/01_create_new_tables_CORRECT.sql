-- Migration: Create camp_parents and camp_counselor_users tables
-- Date: 2026-02-07
-- Version: 12.175 (CORRECTED for your actual structure)

-- ============================================================================
-- Your table structure (confirmed by diagnostic):
-- - id: TEXT (primary key, defaults to 'main')
-- - data: JSONB (stores array of user objects)
-- - updated_at: TIMESTAMP WITH TIME ZONE (auto-updated)
-- ============================================================================

-- Create camp_parents table
CREATE TABLE IF NOT EXISTS camp_parents (
    id TEXT PRIMARY KEY DEFAULT 'main',
    data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create camp_counselor_users table
CREATE TABLE IF NOT EXISTS camp_counselor_users (
    id TEXT PRIMARY KEY DEFAULT 'main',
    data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Verify camp_admins exists (create if it doesn't)
CREATE TABLE IF NOT EXISTS camp_admins (
    id TEXT PRIMARY KEY DEFAULT 'main',
    data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================================================
-- Insert initial 'main' row with empty array for each table
-- ============================================================================

-- Insert for camp_parents
INSERT INTO camp_parents (id, data)
VALUES ('main', '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Insert for camp_counselor_users
INSERT INTO camp_counselor_users (id, data)
VALUES ('main', '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Insert for camp_admins (if it doesn't exist)
INSERT INTO camp_admins (id, data)
VALUES ('main', '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Verification: Check that tables were created
-- ============================================================================

SELECT
    'camp_parents' as table_name,
    EXISTS(SELECT 1 FROM camp_parents WHERE id = 'main') as has_main_row,
    (SELECT jsonb_array_length(data) FROM camp_parents WHERE id = 'main') as user_count
UNION ALL
SELECT
    'camp_counselor_users',
    EXISTS(SELECT 1 FROM camp_counselor_users WHERE id = 'main'),
    (SELECT jsonb_array_length(data) FROM camp_counselor_users WHERE id = 'main')
UNION ALL
SELECT
    'camp_admins',
    EXISTS(SELECT 1 FROM camp_admins WHERE id = 'main'),
    (SELECT jsonb_array_length(data) FROM camp_admins WHERE id = 'main');

-- Expected output:
-- table_name            | has_main_row | user_count
-- ----------------------|--------------|------------
-- camp_parents          | true         | 0
-- camp_counselor_users  | true         | 0
-- camp_admins           | true         | 0 (or more if admins exist)
