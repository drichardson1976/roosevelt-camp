-- Migration: Split camp_registered_users into camp_parents and camp_counselor_users
-- Date: 2026-02-07
-- Version: 12.172

-- ============================================================================
-- STEP 1: Create camp_parents table
-- ============================================================================
CREATE TABLE IF NOT EXISTS camp_parents (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_camp_parents_name ON camp_parents(name);

-- Insert 'main' record with empty array
INSERT INTO camp_parents (name, data)
VALUES ('main', '[]'::jsonb)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 2: Create camp_counselor_users table
-- ============================================================================
CREATE TABLE IF NOT EXISTS camp_counselor_users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_camp_counselor_users_name ON camp_counselor_users(name);

-- Insert 'main' record with empty array
INSERT INTO camp_counselor_users (name, data)
VALUES ('main', '[]'::jsonb)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 3: Verify camp_admins exists (it should already exist)
-- ============================================================================
-- This table should already exist from previous setup
-- If not, create it:
CREATE TABLE IF NOT EXISTS camp_admins (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_camp_admins_name ON camp_admins(name);

-- Ensure 'main' record exists
INSERT INTO camp_admins (name, data)
VALUES ('main', '[]'::jsonb)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify tables were created:
-- SELECT * FROM camp_parents;
-- SELECT * FROM camp_counselor_users;
-- SELECT * FROM camp_admins;
