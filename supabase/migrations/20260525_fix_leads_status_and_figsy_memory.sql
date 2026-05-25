-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Fix leads.status constraint + add figsy_memory.last_winning_angle
-- Date:      2026-05-25
--
-- Issues fixed:
--   1. leads.status CHECK constraint missing 'contacted' — FIGSY Day 1 outreach
--      crashes with constraint violation every time it tries to mark a lead sent.
--   2. figsy_memory.last_winning_angle column missing — generateSequenceWithMemory
--      silently fails to include the best-performing campaign angle context.
--
-- Run in: Supabase SQL Editor → New Query → Paste → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Fix leads.status CHECK constraint ──────────────────────────────────────
-- Postgres doesn't support ALTER CHECK constraint — must drop and re-add.

-- Drop existing constraint (name from schema.sql)
ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_status_check;

-- Re-add with 'contacted' included
ALTER TABLE public.leads
  ADD CONSTRAINT leads_status_check
    CHECK (status IN (
      'pending',
      'scored',
      'contacted',
      'consent_sent',
      'consent_given',
      'exported',
      'rejected',
      'opted_out'
    ));

-- ── 2. Add last_winning_angle to figsy_memory ─────────────────────────────────
ALTER TABLE public.figsy_memory
  ADD COLUMN IF NOT EXISTS last_winning_angle text;

-- ── Verify ────────────────────────────────────────────────────────────────────
-- Check leads constraint
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.leads'::regclass
  AND conname = 'leads_status_check';

-- Check figsy_memory column
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'figsy_memory'
  AND column_name  = 'last_winning_angle';
