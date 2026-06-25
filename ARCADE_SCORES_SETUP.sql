-- ============================================================================
-- ARCADE_SCORES TABLE - Database-backed high score system for RAYMA Arcade
-- ============================================================================
-- Purpose: Store all arcade game scores for each user
-- This table enables persistent high score tracking across sessions

CREATE TABLE arcade_scores (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign key to users table
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Game identifier (e.g., 'retrosnake', 'space_invaders', 'sky_striker')
  game_name TEXT NOT NULL,
  
  -- The score value
  score INTEGER NOT NULL DEFAULT 0,
  
  -- When this score was achieved
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Timestamps for tracking updates
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES - Optimize common queries
-- ============================================================================

-- Index for fetching a user's highest score for a specific game
CREATE INDEX idx_arcade_scores_user_game 
  ON arcade_scores(user_id, game_name, score DESC);

-- Index for leaderboard queries (top scores globally)
CREATE INDEX idx_arcade_scores_game_score 
  ON arcade_scores(game_name, score DESC);

-- Index for timestamp-based queries (recent scores)
CREATE INDEX idx_arcade_scores_created_at 
  ON arcade_scores(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - Users can only see their own scores
-- ============================================================================

-- Enable RLS on the table
ALTER TABLE arcade_scores ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can insert their own scores
CREATE POLICY "Users can insert their own scores"
  ON arcade_scores
  FOR INSERT
  WITH CHECK (auth.uid()::uuid = user_id);

-- Policy 2: Users can read their own scores
CREATE POLICY "Users can read their own scores"
  ON arcade_scores
  FOR SELECT
  USING (auth.uid()::uuid = user_id);

-- Policy 3: Users can update their own scores (optional - for corrections)
CREATE POLICY "Users can update their own scores"
  ON arcade_scores
  FOR UPDATE
  USING (auth.uid()::uuid = user_id);

-- ============================================================================
-- SAMPLE DATA - For testing (REMOVE IN PRODUCTION)
-- ============================================================================
-- Uncomment to populate test data:
/*
INSERT INTO arcade_scores (user_id, game_name, score) VALUES
  ('12345678-1234-1234-1234-123456789012', 'retrosnake', 850),
  ('12345678-1234-1234-1234-123456789012', 'retrosnake', 750),
  ('12345678-1234-1234-1234-123456789012', 'space_invaders', 1200),
  ('87654321-4321-4321-4321-210987654321', 'retrosnake', 920),
  ('87654321-4321-4321-4321-210987654321', 'sky_striker', 560);
*/

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the table is set up correctly:

-- Check table structure
-- SELECT * FROM information_schema.columns WHERE table_name = 'arcade_scores';

-- Check indexes
-- SELECT * FROM pg_indexes WHERE tablename = 'arcade_scores';

-- Check RLS policies
-- SELECT * FROM pg_policies WHERE tablename = 'arcade_scores';
