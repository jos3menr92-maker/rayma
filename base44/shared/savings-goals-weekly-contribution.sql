-- Migration: Add weekly_contribution column to savings_goals table
-- Bug: "weekly_contribution field for savings goals is inaccessible" (BugReport)
-- The column exists in the Base44 SavingsGoal entity but was missing from the Supabase table.
-- Run this in the Supabase SQL editor to add the column.

ALTER TABLE savings_goals ADD COLUMN IF NOT EXISTS weekly_contribution NUMERIC DEFAULT 0;