-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: leads.set_aside_reason — the structural gate's record of a refused
--            Proof candidate (C04, founder-locked 10 Sep 2026)
--
-- WHY. Proof used to surface every fetched person and let the client do our
-- filtering: a UK / digital-marketing-agency / 10-50 staff / Founder-or-CEO
-- target was shown management consultancies scored 70-75 and starred
-- "We'd start here". `apps/api/src/lib/proof-fit.ts` now decides the four hard
-- criteria deterministically BEFORE anything is scored or surfaced, and this
-- column is the record of each refusal: which criterion, in plain words.
--
-- Without it a refused candidate is indistinguishable from an unprocessed one,
-- and `surfaceEverything` would put it back on the desk on the next pass.
--
-- WHY NOT A STATUS. `leads_status_check` allows exactly pending · scored ·
-- contacted · consent_sent · consent_given · exported · rejected · opted_out.
-- Adding `set_aside` would mean DROP + re-ADD on the constraint the whole
-- outreach path writes through, for no gain — the fact recorded here is a
-- REASON, not a lifecycle state. Founder-locked: do not widen that CHECK.
--
-- Additive, nullable, no default, no backfill, idempotent. Inert until read.
--
-- Canonical copy of the PENDING_MIGRATIONS entry
-- `20260910_lead_set_aside_reason` — the two must stay identical.
-- Run in: Vida → Command Centre → System → migrations
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS set_aside_reason text;

CREATE INDEX IF NOT EXISTS leads_set_aside_reason_idx
  ON public.leads (client_id, set_aside_reason)
  WHERE set_aside_reason IS NOT NULL;

COMMENT ON COLUMN public.leads.set_aside_reason IS
  'Why this candidate was never shown to the client - one of the four hard criteria (geography, size, industry, seniority) in plain words, written by the deterministic structural gate in proof-fit.ts BEFORE scoring and surfacing. NULL means never set aside. A set-aside row is kept for operational accounting and audit, is never surfaced, and can never recycle into a later Proof pass. It is deliberately NOT a leads.status value: status is a lifecycle state and this is a reason, and widening leads_status_check would touch the constraint the whole outreach path writes through.';
