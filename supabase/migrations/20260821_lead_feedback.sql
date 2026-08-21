-- ── CALIBRATION v1 — THE REASON BEHIND A PASS (P32, 21 Aug) ─────────────────────────────
--
-- Founder doctrine (Jack & Jill K.2, adopted): *"Approve/Pass IS the calibration event —
-- capture the REASON and the product gets smarter every time a client clicks."*
--
-- ⚠️ WHAT WE LOSE TODAY, EVERY DAY. A client passes six leads. We record six noes. We do not
-- record a single WHY. Tomorrow we source more of exactly what they rejected — and from their
-- side it feels like they told us and we ignored it. They didn't tell us: Pass carries no
-- reason. But the experience is identical to being ignored, and that is what churns people.
--
-- ⚠️ THIS TABLE IS DELIBERATELY THIN. No scores, no derived fields, no computed "signal
-- strength" — those are read-side questions and belong in code that can change without a
-- migration. What is expensive and irreversible is NOT CAPTURING the reason at the moment the
-- human had it in their head. Everything else can be decided later; that cannot.

create table if not exists public.lead_feedback (
  id          uuid primary key default uuid_generate_v4(),
  client_id   uuid not null references public.clients(id) on delete cascade,
  lead_id     uuid not null references public.leads(id)   on delete cascade,
  -- 'pass' today. 'approve' is deliberately permitted by the check so approve-side capture
  -- (the founder's "optionally Approve") needs no migration if he rules for it later.
  action      text not null check (action in ('pass', 'approve')),
  -- NULLABLE ON PURPOSE. The chip is optional and must never block the action, so a pass with
  -- no reason is a real, valid row — it records that the client passed and declined to say why,
  -- which is itself worth knowing. A NOT NULL here would have forced the UI to make the chip
  -- mandatory, quietly turning a one-tap nicety into a gate.
  reason_code text check (reason_code in (
    'too_big', 'too_small', 'wrong_industry', 'wrong_role', 'wrong_geography', 'bad_timing', 'other'
  )),
  -- The client's own words. STORED AND SURFACED, NEVER AUTO-APPLIED (founder-gated): a parser
  -- acting on free text would be the product changing a client's targeting based on a sentence
  -- nobody read. A human reads this in Vida.
  free_text   text,
  created_at  timestamptz not null default now()
);

-- The read this table exists for: "what has THIS client been rejecting lately?" — client-scoped
-- and time-ordered, because calibration cares about recent opinion, not opinion from March.
create index if not exists lead_feedback_client_recent_idx
  on public.lead_feedback (client_id, created_at desc);

-- One feedback row per (client, lead, action): a client who taps a chip, changes their mind and
-- taps another is correcting themselves, not voting twice. The API upserts on this key so the
-- last tap wins rather than accumulating contradictory rows nobody can reconcile.
create unique index if not exists lead_feedback_one_per_lead_action
  on public.lead_feedback (client_id, lead_id, action);

alter table public.lead_feedback enable row level security;

-- Service role (the API) only, exactly like operator_audit_log and outcome_events. Every read
-- in application code is already scoped by client_id; RLS is the floor under that, not a
-- substitute for it.
