-- ============================================================
-- Rayma AI — Remaining Schema Fixes
-- Run after schema-alignment.sql
-- ============================================================

-- 1. bank_accounts: add the two remaining missing columns
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'checking';
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS last_synced DATE;

-- 2. promo_codes: fix RLS — grant service_role full access
-- First, check if RLS is enabled
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

-- Drop conflicting policies if any
DROP POLICY IF EXISTS "Service role full access to promo_codes" ON promo_codes;
DROP POLICY IF EXISTS "Admin read access to promo_codes" ON promo_codes;

-- Grant service_role full access (service_role bypasses RLS by default,
-- but explicit policy ensures it works even if RLS was enabled)
CREATE POLICY "Service role full access to promo_codes"
  ON promo_codes FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow admins to read promo codes
CREATE POLICY "Admin read access to promo_codes"
  ON promo_codes FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

-- 3. Backfill account_type for existing bank_accounts rows
UPDATE bank_accounts SET account_type = 'checking' WHERE account_type IS NULL;

-- ============================================================
-- VERIFICATION
-- ============================================================
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_schema='public' AND table_name='bank_accounts'
-- ORDER BY ordinal_position;
--
-- SELECT tablename, policyname, roles, cmd, qual FROM pg_policies
-- WHERE tablename = 'promo_codes';