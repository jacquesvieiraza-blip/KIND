-- ═══════════════════════════════════════════════════════════════════════════════
-- CONSOLIDATED HERE 31 Jul 2026 (#273) — original: apps/api/src/migrations/20260725_client_inboxes.sql
-- ═══════════════════════════════════════════════════════════════════════════════
-- The SQL below this header is BYTE-IDENTICAL to the original. Nothing was rewritten,
-- reordered or "fixed" on the way in: a migration that has (or has not) been applied to
-- production is a historical fact, and editing it while copying would destroy the only
-- record of what was actually run.
--
-- The original file still exists and carries a tombstone header pointing here. A test
-- (`migration-home.test.ts`) asserts the two bodies stay identical, so editing one copy
-- without the other fails the gate — which is the duplication risk turned into a guard.
-- ═══════════════════════════════════════════════════════════════════════════════

-- CLIENT INBOXES — the sending identity per client (V7 Engine + V9 SOP triggers #270/#271).
--
-- Why this table has to exist: RULEBOOK 12.2 — "you cannot share a sender across clients;
-- one client's spam complaints poison the rest." Every client needs isolated, warmed
-- sending. Until now nothing recorded WHICH inbox sends for WHICH client, so:
--   • V7 (Engine) had nothing to show per-inbox health for — the engine was invisible, and
--     a burning inbox would kill delivery silently.
--   • V9 (#270/#271) had nowhere to record the pool→branded lifecycle, so the founder-gated
--     steps lived only in an alert email and could rot unnoticed.
--
-- The locked SOP (docs/client-flow-sop.md) is: trial signup → assign a PRE-WARMED POOLED
-- inbox (instant, client sends day 1) → on conversion buy their OWN BRANDED inbox (warms
-- ~14 days while they keep sending on the pool, so there is NO gap) → ~day 29 switch to
-- branded and release the pooled one back to the pool. This table is that lifecycle.
--
-- Idempotent. Safe to re-run.

CREATE TABLE IF NOT EXISTS public.client_inboxes (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id         uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  email             text NOT NULL,
  -- pooled = generic pre-warmed inbox from the Smartlead pool (instant, ~$45, recycled)
  -- branded = the client's OWN domain mailbox ($13/yr + $4.50/mo), warms ~14d
  kind              text NOT NULL CHECK (kind IN ('pooled','branded')),
  -- assigned → sending now · warming → branded, warming, NOT yet sending
  -- active    → the client's live sender · released → back to the pool · retired → done
  status            text NOT NULL DEFAULT 'assigned'
                    CHECK (status IN ('assigned','warming','active','released','retired')),
  provider          text DEFAULT 'smartlead',
  daily_cap         integer,
  warmup_started_at timestamptz,
  warmup_ready_at   timestamptz,   -- ~14 days after warmup_started_at for a branded inbox
  assigned_at       timestamptz NOT NULL DEFAULT now(),
  released_at       timestamptz,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_inboxes_client_id_idx ON public.client_inboxes(client_id);
CREATE INDEX IF NOT EXISTS client_inboxes_status_idx    ON public.client_inboxes(status);

-- One live sender per (client, kind): a client can hold a pooled inbox AND a warming
-- branded one at the same time (that overlap is exactly what makes the switch gapless),
-- but never two of the same kind in flight.
CREATE UNIQUE INDEX IF NOT EXISTS client_inboxes_one_live_per_kind
  ON public.client_inboxes(client_id, kind)
  WHERE status IN ('assigned','warming','active');
