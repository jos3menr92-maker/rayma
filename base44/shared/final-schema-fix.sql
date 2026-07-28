-- Run this entire block in Supabase SQL Editor

ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'checking';
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS last_synced DATE;
UPDATE bank_accounts SET account_type = 'checking' WHERE account_type IS NULL;

ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access to promo_codes" ON promo_codes;
DROP POLICY IF EXISTS "Admin read access to promo_codes" ON promo_codes;
CREATE POLICY "Service role full access to promo_codes" ON promo_codes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admin read access to promo_codes" ON promo_codes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));