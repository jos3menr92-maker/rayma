-- ============================================================
-- Rayma AI — Schema Alignment Script (Option B)
-- Rename DB columns to match frontend/Base44 entity expectations
-- All affected tables have 0 rows — safe to rename
-- ============================================================

-- 1. budget_categories: rename limit_amount → monthly_limit, add missing columns
ALTER TABLE budget_categories RENAME COLUMN limit_amount TO monthly_limit;
ALTER TABLE budget_categories ADD COLUMN IF NOT EXISTS category_key TEXT;
ALTER TABLE budget_categories ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE budget_categories ADD COLUMN IF NOT EXISTS icon TEXT;

-- 2. loan_adjustments: rename adjustment_date → date, add direction
ALTER TABLE loan_adjustments RENAME COLUMN adjustment_date TO date;
ALTER TABLE loan_adjustments ADD COLUMN IF NOT EXISTS direction TEXT;

-- 3. user_memories: rename memory_key → memory_type, memory_value → content
ALTER TABLE user_memories RENAME COLUMN memory_key TO memory_type;
ALTER TABLE user_memories RENAME COLUMN memory_value TO content;

-- 4. arcade_scores: add game column (frontend uses 'game', not 'game_id')
ALTER TABLE arcade_scores ADD COLUMN IF NOT EXISTS game TEXT;

-- 5. bank_accounts: add missing columns for account creation
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'checking';
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS last_synced DATE;

-- 6. promo_redemptions: add created_at if missing
ALTER TABLE promo_redemptions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- 7. promo_codes: fix RLS for service role access
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Service role full access to promo_codes"
  ON promo_codes FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- VERIFICATION (run after executing above)
-- ============================================================
-- SELECT table_name, column_name, data_type
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name IN ('budget_categories', 'loan_adjustments',
--                      'user_memories', 'arcade_scores', 'bank_accounts')
-- ORDER BY table_name, ordinal_position;