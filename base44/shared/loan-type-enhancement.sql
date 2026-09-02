-- Loan System Enhancement: diverse loan types + payment-amount semantics.
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New Query).
-- Safe to re-run (idempotent).

-- 1. Payment-amount disambiguation (per-period vs monthly-equivalent)
ALTER TABLE loans ADD COLUMN IF NOT EXISTS payment_amount_type TEXT DEFAULT 'per_period';

-- 2. Flexible JSONB block for type-specific structured fields
ALTER TABLE loans ADD COLUMN IF NOT EXISTS loan_type_attributes JSONB DEFAULT '{}'::jsonb;

-- 3. Normalize legacy mixed-case category values to the canonical lowercase enum.
--    (The audit found 'Lease', 'Credit Card', 'bankruptcy' etc. stored as free text.)
UPDATE loans SET category = 'credit_card' WHERE category ILIKE 'credit card';
UPDATE loans SET category = 'line_of_credit' WHERE category ILIKE 'line of credit';
UPDATE loans SET category = lower(category)
  WHERE category IS NOT NULL
    AND category <> lower(category)
    AND lower(category) IN ('mortgage','auto','student','personal','credit_card','line_of_credit','lease','bankruptcy','medical','other');

-- 4. Anything still not in the allowed set collapses to 'other'
UPDATE loans SET category = 'other'
  WHERE category IS NOT NULL
    AND category NOT IN ('mortgage','auto','student','personal','credit_card','line_of_credit','lease','bankruptcy','medical','other');