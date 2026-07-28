-- =====================================================
-- Rayma AI — RLS Policy Verification & Setup
-- Run this in your Supabase SQL Editor
-- =====================================================

-- 1. CHECK: Which tables have RLS enabled?
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Expected: rowsecurity = true for ALL 19 tables

-- =====================================================
-- 2. ENABLE RLS on any table that's missing it
-- =====================================================

ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE net_worth_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE arcade_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_price_alerts ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. CHECK: Which tables have existing policies?
-- =====================================================

SELECT tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =====================================================
-- 4. CREATE standard user-ownership policies
--    (safe to run — IF NOT EXISTS prevents duplicates)
--    Each table gets: user can only see/edit their own rows
-- =====================================================

-- Helper: generates a policy for ALL operations on a table
-- where user_id = auth.uid()

DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'bank_accounts', 'loans', 'bills', 'transactions', 'assets',
    'savings_goals', 'incomes', 'payments', 'loan_adjustments',
    'net_worth_snapshots', 'budget_categories', 'documents',
    'transaction_splits', 'user_memories', 'feedback',
    'arcade_scores', 'profiles', 'bill_price_alerts'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    BEGIN
      EXECUTE format('
        CREATE POLICY IF NOT EXISTS %I ON %I
          FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
      ', 'own_' || tbl, tbl);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipped %: %', tbl, SQLERRM;
    END;
  END LOOP;
END $$;

-- =====================================================
-- 5. promo_codes — admin-only (no user_id column)
--    Keep this table locked down; managed via backend only
-- =====================================================

-- NOTE: promo_codes should NOT have user-level RLS.
-- Access is controlled through the Base44 backend function
-- (redeemPromoCode) using the service role key.
-- If you want frontend reads blocked entirely:
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
-- No policy = no access from the anon key (service role bypasses RLS)

-- =====================================================
-- 6. VERIFY: Re-check RLS status after running
-- =====================================================

SELECT 
  t.tablename,
  t.rowsecurity AS rls_enabled,
  COUNT(p.policyname) AS policy_count
FROM pg_tables t
LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = 'public'
WHERE t.schemaname = 'public'
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename;

-- Every table should show rls_enabled = true
-- User-data tables should show policy_count >= 1
-- promo_codes should show policy_count = 0 (locked down)