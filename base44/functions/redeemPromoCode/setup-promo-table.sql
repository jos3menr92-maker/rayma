-- ========================================
-- RAYMA: Promo Codes Table Setup
-- ========================================
-- Purpose: Store promotional codes that users can redeem for energy bars, tokens, or passes
-- This table tracks code usage, expiration, and redemption by users
--
-- Reward Types:
--   'energy_bars' - Add energy bars to the user's balance
--   'tokens' - Add AI tokens/credits
--   'annual_pass' - Grant annual subscription pass
-- ========================================

-- ✓ STEP 1: Create the promo_codes table
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,          -- Unique promo code (e.g., "SUMMER2024", "SPONSOR001")
  reward_type VARCHAR(50) NOT NULL,          -- Type: 'energy_bars', 'tokens', or 'annual_pass'
  reward_value INTEGER NOT NULL,             -- Number of bars/tokens to grant (or 1 for annual_pass)
  is_active BOOLEAN DEFAULT true,            -- Can be deactivated without deleting
  max_uses INTEGER,                          -- Maximum total uses (NULL = unlimited)
  times_used INTEGER DEFAULT 0,              -- How many times this code has been redeemed
  expires_at TIMESTAMP WITH TIME ZONE,       -- Expiration date/time (NULL = never expires)
  redeemed_by UUID[] DEFAULT ARRAY[]::UUID[],-- Array of user IDs who have used this code (for one-per-user enforcement)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID,                           -- Admin who created this code
  description TEXT                           -- Internal notes (e.g., "Early backer reward", "Twitch giveaway")
);

-- ✓ STEP 2: Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_is_active ON promo_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_promo_codes_expires_at ON promo_codes(expires_at);

-- ✓ STEP 3: Enable Row Level Security (RLS)
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

-- ✓ STEP 4: Create RLS Policy - Users can query active codes (read-only)
CREATE POLICY "Users can view active promo codes"
  ON promo_codes
  FOR SELECT
  USING (is_active = true OR auth.uid() IN (SELECT user_id FROM users WHERE role = 'admin'));

-- ✓ STEP 5: Create RLS Policy - Admins can manage promo codes
CREATE POLICY "Admins can manage promo codes"
  ON promo_codes
  FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM users WHERE role = 'admin'));

-- ✓ STEP 6: Insert sample promo codes for testing
-- (Remove these after testing in production)
INSERT INTO promo_codes (code, reward_type, reward_value, is_active, max_uses, expires_at, description)
VALUES
  ('WELCOME50', 'energy_bars', 50, true, NULL, '2025-12-31 23:59:59'::timestamp with time zone, 'Welcome bonus for new users'),
  ('SUMMER2024', 'energy_bars', 100, true, 50, '2024-08-31 23:59:59'::timestamp with time zone, 'Summer campaign - limited'),
  ('SPONSOR001', 'annual_pass', 1, true, 1, NULL, 'Special sponsor pass'),
  ('EARLYACCESS', 'tokens', 1000, false, NULL, NULL, 'Early access program (inactive)')
ON CONFLICT DO NOTHING;

-- ✓ STEP 7: Create an audit log table to track redemptions (optional but recommended)
CREATE TABLE IF NOT EXISTS promo_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id UUID NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reward_type VARCHAR(50) NOT NULL,
  reward_value INTEGER NOT NULL,
  ip_address INET,                           -- For fraud detection
  user_agent TEXT                            -- For fraud detection
);

CREATE INDEX IF NOT EXISTS idx_promo_redemptions_user_id ON promo_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_promo_code_id ON promo_redemptions(promo_code_id);

-- ========================================
-- GRANT PERMISSIONS (if using service role)
-- ========================================
-- GRANT SELECT ON promo_codes TO authenticated;
-- GRANT ALL ON promo_codes TO service_role;
-- GRANT ALL ON promo_redemptions TO service_role;

-- ========================================
-- VERIFY SETUP
-- ========================================
-- Run this query to verify the table was created:
-- SELECT * FROM promo_codes LIMIT 5;

-- ========================================
-- CLEANUP: Drop the tables (if needed)
-- ========================================
-- DROP TABLE IF EXISTS promo_redemptions;
-- DROP TABLE IF EXISTS promo_codes;
