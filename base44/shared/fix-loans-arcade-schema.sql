-- ============================================================
-- Rayma AI — Schema Fixes (Loans + Arcade Scores)
-- Run once in the Supabase SQL Editor. Idempotent — safe to re-run.
-- ============================================================

-- ------------------------------------------------------------
-- #3  loans table — columns written by AddLoan.jsx
-- ------------------------------------------------------------
-- AddLoan inserts `due_date` (ISO date) and `total_payments` (int).
-- The legacy loans schema only had due_day / due_day_of_week, so
-- those inserts fail when the columns are absent. Add if missing.
ALTER TABLE loans ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS total_payments INTEGER;

-- ------------------------------------------------------------
-- #4  arcade_scores table — used by arcadeScore / arcadeScores /
--     saveArcadeScore (service-role key, RLS bypassed)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS arcade_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Guarantee columns exist even if the table pre-existed in a
-- different shape (no-op when already present).
ALTER TABLE arcade_scores ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE arcade_scores ADD COLUMN IF NOT EXISTS game_id TEXT;
ALTER TABLE arcade_scores ADD COLUMN IF NOT EXISTS score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE arcade_scores ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE arcade_scores ENABLE ROW LEVEL SECURITY;

-- Owner-only policy for any future direct-frontend reads/writes.
-- Drop & recreate so this script stays re-runnable.
DROP POLICY IF EXISTS "arcade_scores owner all" ON arcade_scores;
CREATE POLICY "arcade_scores owner all" ON arcade_scores
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Supports the "highest score per game" queries used by the app.
CREATE INDEX IF NOT EXISTS arcade_scores_user_game_idx
  ON arcade_scores (user_id, game_id, score DESC);