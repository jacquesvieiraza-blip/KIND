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
--
-- ── ⛓️ 18 Sep 2026 — 'passed' ADDED HERE, BY FOUNDER APPROVAL ───────────────────
--
-- `passLead` (apps/api/src/lib/approve-lead.ts) writes `status = 'passed'` when a
-- client says "not a fit". This constraint did not permit it, so the product was
-- writing a value its own schema of record forbade, and on any database where this
-- CHECK is live the pass action failed outright — surfacing to the client as
-- "Lead not found or already actioned" on a card they were looking straight at.
--
-- FOUNDER DECISION, 18 Sep 2026, verbatim:
--   "APPROVE PASSED. Add `passed` to the allowed lead-status CHECK."
--   Bounded by: "Preserve every existing allowed status." · "Preserve the existing
--   `set_aside` rule/lock unchanged." · "Do not change any other lead-status
--   semantics."
--
-- ⛓️ THIS SUPERSEDES THE 10 Sep STANDING DECISION, which was explicitly provisional:
-- ~~"Do NOT add 'passed' to the CHECK constraint AT THIS STAGE."~~ Both are dated,
-- the later one governs, and neither is deleted.
--
-- 🛑 WIDENED HERE RATHER THAN IN A NEW MIGRATION, AND THAT IS THE REPO'S OWN RULE.
-- `constraint-ownership.test.ts` refuses two migrations declaring one constraint
-- name — "delete the duplicate declaration and widen the OWNER instead" — because
-- PENDING_MIGRATIONS executes in ARRAY order, not date order, so the loser's
-- definition can silently win. This file is that constraint's owner.
--
-- ⚠️ AND A SEPARATE MIGRATION WOULD HAVE BEEN UNSAFE ON PRODUCTION. 20260723 records
-- that prod's `leads.status` is an ENUM with no `leads_status_check` at all; a new
-- migration re-declaring the constraint would CREATE one there, on a column that
-- never had it. Widening the owner changes only databases this file already governs.
--
-- ⚠️ `set_aside` IS DELIBERATELY ABSENT. The 10 Sep lock — "do not widen that CHECK"
-- — is about a REASON, not a lifecycle state, and `set_aside_reason` remains its own
-- column. 'passed' is a lifecycle state the product already writes.
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
      'opted_out',
      'passed'
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
