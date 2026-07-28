-- =====================================================
-- Rayma AI — Schema Consistency Check & Fix
-- Run this in your Supabase SQL Editor
-- =====================================================
-- This script checks that all Supabase tables have the
-- columns the frontend expects, and adds any missing ones.
-- =====================================================

-- =====================================================
-- 1. TABLE NAMES — Verify all expected tables exist
-- =====================================================

SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Expected tables (19):
-- bank_accounts, loans, bills, transactions, assets,
-- savings_goals, incomes, payments, loan_adjustments,
-- net_worth_snapshots, budget_categories, documents,
-- transaction_splits, profiles, arcade_scores,
-- user_memories, feedback, promo_codes, bill_price_alerts

-- NOTE: The frontend uses "incomes" (NOT "weekly_incomes")
-- NOTE: The frontend uses "profiles" (NOT "user_profiles")

-- =====================================================
-- 2. COLUMN CHECK — List all columns per table
-- =====================================================

SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- =====================================================
-- 3. ADD MISSING COLUMNS — Safe to run (IF NOT EXISTS)
-- =====================================================

-- --- bank_accounts: frontend uses these columns ---
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'checking';
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS last_synced DATE;
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS plaid_account_id TEXT;
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS plaid_access_token TEXT;
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS link_method TEXT DEFAULT 'manual';
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- --- loans: frontend uses these columns ---
ALTER TABLE loans ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS due_day INTEGER;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS due_day_of_week TEXT;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS payment_frequency TEXT DEFAULT 'monthly';
ALTER TABLE loans ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE loans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- --- bills: frontend uses these columns ---
ALTER TABLE bills ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'other';
ALTER TABLE bills ADD COLUMN IF NOT EXISTS due_day INTEGER;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS due_day_of_week TEXT;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS payment_frequency TEXT DEFAULT 'monthly';
ALTER TABLE bills ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS last_paid_date DATE;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS suggested_by_rayma BOOLEAN DEFAULT false;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS rayma_approval_status TEXT DEFAULT 'pending';
ALTER TABLE bills ADD COLUMN IF NOT EXISTS detected_from_merchant TEXT;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS autopay BOOLEAN DEFAULT false;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- --- transactions: frontend uses these columns ---
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'other';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'debit';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS bank_account_id UUID;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- --- assets: frontend uses these columns ---
ALTER TABLE assets ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'cash';
ALTER TABLE assets ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- --- savings_goals: frontend uses these columns ---
ALTER TABLE savings_goals ADD COLUMN IF NOT EXISTS weekly_contribution NUMERIC;
ALTER TABLE savings_goals ADD COLUMN IF NOT EXISTS target_date DATE;
ALTER TABLE savings_goals ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE savings_goals ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE savings_goals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- --- incomes: frontend uses these columns ---
-- NOTE: table name is "incomes" (not "weekly_incomes")
ALTER TABLE incomes ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE incomes ADD COLUMN IF NOT EXISTS frequency TEXT DEFAULT 'biweekly';
ALTER TABLE incomes ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE incomes ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE incomes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- --- payments: frontend uses these columns ---
ALTER TABLE payments ADD COLUMN IF NOT EXISTS loan_id UUID;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS bill_id UUID;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'loan';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- --- loan_adjustments: frontend uses these columns ---
ALTER TABLE loan_adjustments ADD COLUMN IF NOT EXISTS direction TEXT;
ALTER TABLE loan_adjustments ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE loan_adjustments ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE loan_adjustments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- --- net_worth_snapshots: frontend uses these columns ---
ALTER TABLE net_worth_snapshots ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE net_worth_snapshots ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- --- budget_categories: frontend uses these columns ---
ALTER TABLE budget_categories ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE budget_categories ADD COLUMN IF NOT EXISTS category_key TEXT;
ALTER TABLE budget_categories ADD COLUMN IF NOT EXISTS monthly_limit NUMERIC;
ALTER TABLE budget_categories ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE budget_categories ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE budget_categories ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE budget_categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- --- documents: frontend uses these columns ---
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS folder TEXT DEFAULT 'misc';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending_review';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS extracted_data JSONB;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS document_type TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS loggable BOOLEAN DEFAULT true;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS logged_entity_type TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS logged_entity_id TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS scan_date DATE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- --- transaction_splits: frontend uses these columns ---
ALTER TABLE transaction_splits ADD COLUMN IF NOT EXISTS transaction_id UUID;
ALTER TABLE transaction_splits ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE transaction_splits ADD COLUMN IF NOT EXISTS amount NUMERIC;
ALTER TABLE transaction_splits ADD COLUMN IF NOT EXISTS date DATE;
ALTER TABLE transaction_splits ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE transaction_splits ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- --- profiles: frontend uses these columns ---
-- NOTE: table name is "profiles" (not "user_profiles")
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_tokens INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_tokens_daily_limit INTEGER DEFAULT 50;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS energy_bars JSONB DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'en';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_color TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- --- arcade_scores: frontend uses these columns ---
ALTER TABLE arcade_scores ADD COLUMN IF NOT EXISTS game TEXT;
ALTER TABLE arcade_scores ADD COLUMN IF NOT EXISTS score INTEGER;
ALTER TABLE arcade_scores ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- --- user_memories: frontend uses these columns ---
ALTER TABLE user_memories ADD COLUMN IF NOT EXISTS memory_type TEXT;
ALTER TABLE user_memories ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE user_memories ADD COLUMN IF NOT EXISTS context TEXT;
ALTER TABLE user_memories ADD COLUMN IF NOT EXISTS importance TEXT DEFAULT 'medium';
ALTER TABLE user_memories ADD COLUMN IF NOT EXISTS last_referenced DATE;
ALTER TABLE user_memories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- --- feedback: frontend uses these columns ---
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS rating INTEGER;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS page TEXT;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- --- bill_price_alerts: frontend uses these columns ---
ALTER TABLE bill_price_alerts ADD COLUMN IF NOT EXISTS bill_id UUID;
ALTER TABLE bill_price_alerts ADD COLUMN IF NOT EXISTS old_amount NUMERIC;
ALTER TABLE bill_price_alerts ADD COLUMN IF NOT EXISTS new_amount NUMERIC;
ALTER TABLE bill_price_alerts ADD COLUMN IF NOT EXISTS acknowledged BOOLEAN DEFAULT false;
ALTER TABLE bill_price_alerts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- =====================================================
-- 4. VERIFY: Print final column list per table
-- =====================================================

SELECT table_name, string_agg(column_name, ', ' ORDER BY ordinal_position) AS columns
FROM information_schema.columns
WHERE table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;