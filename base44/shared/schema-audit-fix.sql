-- ============================================================
-- Rayma AI — Supabase Schema Audit Fix Script
-- Generated from auditSupabaseTables backend function results
-- Run in Supabase SQL Editor to add missing columns
-- ============================================================

-- 1. bank_accounts: Add missing columns used by BankAccounts.jsx
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'checking';
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS last_synced DATE;

-- 2. budget_categories: Add missing columns used by BudgetDashboard.jsx
ALTER TABLE budget_categories ADD COLUMN IF NOT EXISTS category_key TEXT;
ALTER TABLE budget_categories ADD COLUMN IF NOT EXISTS monthly_limit NUMERIC;
ALTER TABLE budget_categories ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE budget_categories ADD COLUMN IF NOT EXISTS icon TEXT;

-- 3. arcade_scores: Add missing game column
ALTER TABLE arcade_scores ADD COLUMN IF NOT EXISTS game TEXT;

-- 4. loan_adjustments: Add missing columns used by LoanAdjustment entity
ALTER TABLE loan_adjustments ADD COLUMN IF NOT EXISTS direction TEXT;
ALTER TABLE loan_adjustments ADD COLUMN IF NOT EXISTS date DATE;

-- 5. user_memories: Add missing columns used by UserMemory entity
ALTER TABLE user_memories ADD COLUMN IF NOT EXISTS memory_type TEXT;
ALTER TABLE user_memories ADD COLUMN IF NOT EXISTS content TEXT;

-- 6. promo_redemptions: Add created_at if missing
ALTER TABLE promo_redemptions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- 7. promo_codes: Fix RLS — allow service role access
-- The service role should bypass RLS, but if there's a policy issue:
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Service role full access to promo_codes"
  ON promo_codes FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
CREATE POLICY IF NOT EXISTS "Admin read access to promo_codes"
  ON promo_codes FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

-- ============================================================
-- VERIFICATION QUERIES (run after executing above)
-- ============================================================
-- SELECT table_name, column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' 
--   AND table_name IN ('bank_accounts', 'budget_categories', 'arcade_scores', 
--                      'loan_adjustments', 'user_memories', 'promo_redemptions')
-- ORDER BY table_name, ordinal_position;