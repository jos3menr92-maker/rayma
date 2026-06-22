-- ========================================
-- RAYMA: Daily Energy Reset Scheduler
-- ========================================
-- Purpose: Reset free users' energy_bars to 10 every day at midnight UTC
-- Schedule: 00:00 UTC (midnight) every day using pg_cron
--
-- Configuration:
--   1. Enable pg_cron extension in Supabase
--   2. Create a scheduler role for the function
--   3. Schedule the HTTP call to the Edge Function
-- ========================================

-- ✓ STEP 1: Enable pg_cron extension (if not already enabled)
-- Run this as a superuser (usually via Supabase dashboard > SQL Editor)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ✓ STEP 2: Create a cron job that calls the Edge Function daily at midnight
-- Replace YOUR_FUNCTION_URL with your actual Supabase Edge Function URL
-- Replace YOUR_SECRET_KEY with the SCHEDULED_JOB_SECRET_KEY environment variable
SELECT cron.schedule(
  'reset-daily-energy-bars',                    -- Job name (unique identifier)
  '0 0 * * *',                                  -- Cron expression: 00:00 UTC every day
  'SELECT http_post(
    ''https://YOUR_RAYMA_PROJECT.supabase.co/functions/v1/resetDailyEnergyBars'',
    to_jsonb(''{}''::jsonb),
    ''{}''::jsonb || jsonb_build_object(
      ''Authorization'', ''Bearer YOUR_SECRET_KEY''
    )
  );'
);

-- ✓ STEP 3: Verify the job was created
SELECT * FROM cron.job WHERE jobname = 'reset-daily-energy-bars';

-- ✓ STEP 4: View job execution logs (after first run)
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'reset-daily-energy-bars')
ORDER BY start_time DESC
LIMIT 10;

-- ========================================
-- MANUAL TESTING (run the function directly)
-- ========================================
-- If you want to test without waiting for cron:

-- Option A: Via Supabase dashboard
-- POST: https://YOUR_RAYMA_PROJECT.supabase.co/functions/v1/resetDailyEnergyBars
-- Headers:
--   Authorization: Bearer YOUR_SECRET_KEY
--   Content-Type: application/json

-- Option B: Via curl (from terminal)
-- curl -X POST \
--   https://YOUR_RAYMA_PROJECT.supabase.co/functions/v1/resetDailyEnergyBars \
--   -H "Authorization: Bearer YOUR_SECRET_KEY" \
--   -H "Content-Type: application/json" \
--   -d '{}'

-- ========================================
-- ENVIRONMENT VARIABLES NEEDED
-- ========================================
-- Add these to your Supabase project settings:
-- SCHEDULED_JOB_SECRET_KEY: A random strong secret (same in pg_cron and Edge Function env)
-- BASE44_APP_ID: Your Base44 app ID (usually already configured)

-- ========================================
-- CLEANUP: Remove the scheduled job (if needed)
-- ========================================
-- SELECT cron.unschedule('reset-daily-energy-bars');
