-- =====================================================
-- Rayma AI — Fix Documents Table Schema
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- This adds the missing columns that Document Vault needs.
-- Safe to run — all use IF NOT EXISTS.
-- =====================================================

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