-- Recurring income auto-log columns
-- Run this in your Supabase SQL editor to add recurring support to the incomes table.

ALTER TABLE incomes ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false;
ALTER TABLE incomes ADD COLUMN IF NOT EXISTS recurring_frequency text DEFAULT 'weekly';
ALTER TABLE incomes ADD COLUMN IF NOT EXISTS recurring_active boolean DEFAULT false;
ALTER TABLE incomes ADD COLUMN IF NOT EXISTS recurring_source_id uuid;

-- Index for faster lookups when checking if a recurring entry already exists
CREATE INDEX IF NOT EXISTS idx_incomes_recurring_source ON incomes(recurring_source_id, week_start);