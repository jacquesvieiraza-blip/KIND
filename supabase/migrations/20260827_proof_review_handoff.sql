-- ── PROOF REVIEW HANDOFF — the exhausted prospect becomes a real piece of work ──────
--
-- WHAT WAS BROKEN. When a prospect had used both free proof passes and asked for another,
-- `POST /icps/:id/proof` returned a 409 saying *"We have shown you two sets of leads. Let us
-- talk it through together…"* and the portal showed *"K.I.N.D will review this with you."*
-- Nobody at K.I.N.D was told. No row was written, no alert fired, no operator surface
-- changed. The client was promised a human and there was no human — the sentence was true
-- about our intent and false about our system.
--
-- ⚠️ WHY THE COLUMNS SIT ON `clients` AND NOT ON `icps`. The proof state they belong beside
-- is already there: `proof_passes_done` and `proof_records_committed` were added to
-- `public.clients` by 20260822_free_proof_acquisition.sql, and the two-pass ceiling is
-- counted PER PROSPECT, not per ICP — a client who made three ICPs still gets two passes in
-- total. Putting the review flag on `icps` would let one prospect hold several unresolved
-- reviews at once, which is exactly the duplicate this migration exists to make impossible.
-- `proof_review_icp_id` records WHICH ICP they were looking at when they asked, because the
-- operator needs to open something; it is a pointer, not the identity of the review.
--
-- ⚠️ THE TRIGGER IS THE ASK, NOT THE PASS COUNT. `proof_passes_done >= 2` alone means only
-- that both passes were GENERATED — the normal, healthy end of a proof that worked. The
-- review exists when the client has used both AND come back wanting another attempt. That
-- is the `claimed <= 0` branch, and nothing else writes these columns.
--
-- MEANING:
--   requested_at IS NOT NULL AND resolved_at IS NULL  →  a human review is OWED right now
--   resolved_at IS NOT NULL                           →  an operator handled it
--   both NULL                                         →  nothing owed (the normal state)
--
-- Additive only: three nullable columns and one partial index. No data is written, moved or
-- deleted, and every existing row reads as "nothing owed" without being touched.

alter table public.clients
  add column if not exists proof_review_requested_at timestamptz,
  add column if not exists proof_review_resolved_at  timestamptz,
  add column if not exists proof_review_icp_id       uuid;

comment on column public.clients.proof_review_requested_at is
  'Set when a prospect who has used BOTH free proof passes asks for another attempt. Never set by pass 1, by a refinement, or by pass 2 completing normally — only by the refused third attempt.';
comment on column public.clients.proof_review_resolved_at is
  'Set by an operator in Vida when the review has been handled. Non-null clears it from the unresolved feed.';
comment on column public.clients.proof_review_icp_id is
  'The ICP the prospect was looking at when they asked for another attempt, so the operator has something to open. A pointer only — the review belongs to the client.';

-- The unresolved feed reads exactly this predicate, on every Vida poll. Partial so the index
-- holds only the handful of rows that are actually owed, never the whole client table.
create index if not exists clients_proof_review_open_idx
  on public.clients (proof_review_requested_at)
  where proof_review_requested_at is not null
    and proof_review_resolved_at is null;
