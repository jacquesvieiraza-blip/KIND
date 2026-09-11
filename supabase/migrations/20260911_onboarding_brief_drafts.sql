-- ── MVP1 — THE BRIEF BEFORE THERE IS A CLIENT (C20/C21, Preview 07) ─────────────────────
--
-- 🛑 WHAT WAS BROKEN. `/auth/signup` creates an auth user and nothing else. The `clients` row
-- is created by the CONFIRM click, which also saves the ICP and starts Proof. So the entire
-- Brief conversation lived in React state in one browser tab: close it and everything Milla
-- had collected was gone, and Vida never knew the person existed.
--
-- Preview 07 — "signed up 14 minutes ago and Milla is collecting their brief", 10 of 11 facts,
-- confirmation still pending — was therefore not a state the product could reach. A client was
-- invisible to the operator until the instant they confirmed, at which point the brief was
-- complete by definition and confirmation was no longer pending.
--
-- ⚠️ THIS IS NOT A SECOND BRIEF MODEL AND NOT A SECOND LIFECYCLE AUTHORITY. It is the
-- PERSISTENCE LOCATION for the same eleven facts, before promotion. Completeness is decided
-- by `packages/shared/src/brief-facts.ts` for every reader — Milla, this table and Vida.
--
-- ⚠️ ONE AUTHORITATIVE WRITABLE STATE AT A TIME.
--   before confirmation  — the draft is the authoritative writable Brief
--   after promotion      — the clients row and the ICP are the operational truth
-- `promoted_client_id` and `confirmed_at` are what close the first: a promoted draft is
-- evidence (audit, provenance, recovery) and must never be read back as a competing mutable
-- source. The application refuses to write a promoted draft; this file records why.
--
-- ⚠️ JSONB FOR THE FACTS, DELIBERATELY. Same shape decision as
-- `programmes.calculator_assumptions`: a snapshot, read back together, never queried across
-- and never aggregated. Column-per-fact would be eleven migrations of churn for a value only
-- ever read whole — and the eleven are defined in shared code, not in the schema.
--
-- ⚠️ NO clients ROW IS CREATED, AND NO EXISTING SEMANTICS CHANGE. "A client" still means a
-- confirmed client everywhere — the worklist, the lifecycle board, every count and every
-- alert keep their meaning. Vida's rail merges drafts as a read-model projection.
--
-- ⚠️ ADDITIVE, NON-DESTRUCTIVE, IDEMPOTENT. One new table, nothing dropped, nothing renamed,
-- no backfill and no existing row written.
--
-- DEPLOYMENT ORDERING: apply before shipping the code that reads or writes it. Until it is
-- applied the draft routes fail closed — Milla keeps its in-memory behaviour exactly as today
-- and Vida's rail simply shows no drafts, which is the current product.

CREATE TABLE IF NOT EXISTS public.onboarding_brief_drafts (
  id                 uuid primary key default uuid_generate_v4(),
  -- The authenticated user. UNIQUE: one in-progress Brief per person, so a second tab
  -- resumes the same draft rather than racing a duplicate into the operator's rail.
  user_id            uuid not null unique references auth.users(id) on delete cascade,
  -- The partial eleven-fact state. `{}` is a real and expected value: a person who has
  -- signed up and said nothing yet.
  facts              jsonb not null default '{}'::jsonb,
  -- The minimum needed to resume the conversation in another tab. Not a chat platform.
  conversation       jsonb,
  -- ⚠️ CONFIRMATION IS A SEPARATE GATE AND IS NEVER ONE OF THE ELEVEN FACTS. It is stamped
  -- when the client confirms a COMPLETE brief, and it is what starts Proof.
  confirmed_at       timestamptz,
  -- Set at promotion. Its presence is what makes this row evidence rather than truth.
  promoted_client_id uuid references public.clients(id) on delete set null,
  promoted_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Vida's rail asks for the drafts that have NOT been promoted. A partial index keeps that
-- read cheap as the table accumulates promoted evidence rows.
CREATE INDEX IF NOT EXISTS onboarding_brief_drafts_open_idx
  ON public.onboarding_brief_drafts(created_at DESC)
  WHERE promoted_client_id IS NULL;

-- ── ROW-LEVEL SECURITY ─────────────────────────────────────────────────────────────────
--
-- 🛑 THIS TABLE IS THE ONE THAT MOST NEEDS IT. Every other client table is keyed by
-- `client_id` and reached through `current_client_id()`. This one is keyed by `user_id` and
-- exists precisely for people who have NO client row — so the usual helper answers NULL for
-- exactly the rows it is meant to protect, and "no policy" would mean a person's company,
-- their contact name, their targeting and their stated outcome are readable by anyone holding
-- the public anon key that apps/portal ships to every browser.
--
-- ⚠️ THE POLICY IS `auth.uid()`, NOT `current_client_id()`, for that reason. A draft belongs
-- to an authenticated USER, before it belongs to a client.
--
-- ⚠️ SELECT AND UPDATE ONLY, AND NO INSERT POLICY ON PURPOSE. The API writes with the service
-- role, which bypasses RLS; a browser must never be able to mint a draft row directly. Read
-- and amend your own, and nothing else.
ALTER TABLE IF EXISTS public.onboarding_brief_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own brief draft readable" ON public.onboarding_brief_drafts;
CREATE POLICY "own brief draft readable" ON public.onboarding_brief_drafts
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "own brief draft writable" ON public.onboarding_brief_drafts;
CREATE POLICY "own brief draft writable" ON public.onboarding_brief_drafts
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

COMMENT ON TABLE public.onboarding_brief_drafts IS
  'MVP1 pre-confirmation Brief persistence. The SAME eleven facts defined in packages/shared/src/brief-facts.ts, stored before a clients row exists. Authoritative and writable until promotion; evidence only afterwards. Not a second Brief model and not a lifecycle authority.';
COMMENT ON COLUMN public.onboarding_brief_drafts.facts IS
  'Partial eleven-fact state as a snapshot. Completeness is decided by shared code, never by this column''s shape.';
COMMENT ON COLUMN public.onboarding_brief_drafts.confirmed_at IS
  'When the client confirmed a COMPLETE brief. A separate gate — never counted as one of the eleven facts.';
COMMENT ON COLUMN public.onboarding_brief_drafts.promoted_client_id IS
  'The clients row this draft became. Once set, the draft is evidence: it may not be written again and may never compete with the confirmed client/ICP truth.';
