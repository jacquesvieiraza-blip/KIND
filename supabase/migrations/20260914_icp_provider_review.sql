-- ═══════════════════════════════════════════════════════════════════════════════════════
-- NEEDS ICP REVIEW — the client's words survive, and a human translates them.
-- (S1-RT-005 · the founder's fail-soft rule.)
--
-- ── THE DEFECT, AND IT WAS LIVE ────────────────────────────────────────────────────────
--
-- "industries", "seniority_levels" and "company_sizes" are CLOSED PROVIDER VOCABULARIES.
-- "boundedEnum" refused the whole Milla reply when every value in one of them was off-list,
-- so a client describing their own market in their own words — "B2B service businesses",
-- "founder-led firms" — was told "Milla didn't catch that", deterministically, for ever.
--
-- The refusal existed for a real reason: an EMPTY closed list means UNCONSTRAINED downstream
-- ("buildPdlBody" adds no filter for a list with no length), so silently turning their answer
-- into "[]" would widen the search to everybody and spend their money on it. Both available
-- answers were wrong. This is the third: keep their words, canonicalise only what we can
-- prove, and put the remainder in front of a person BEFORE anything is sourced or spent.
--
--     THE CLIENT SPEAKS NATURALLY. THE CLIENT NEVER HAS TO SPEAK APOLLO.
--     PROVIDER TRANSLATION IS OUR PROBLEM, NOT THEIRS.
--
-- ── WHY NOT "pending_targeting" ────────────────────────────────────────────────────────
--
-- 🛑 IT MEANS SOMETHING ELSE, AND OVERLOADING IT WOULD BREAK A LIVE READER. That column is
-- "a revision the client submitted, waiting for GO" — Vida renders it as *"⏸ Revision waiting
-- since … Not in effect; GO applies it"*, and "pending_campaign_intent" travels with it. A
-- brand-new ICP that has never been live is not a revision of anything, and a column whose
-- two meanings disagree about whether the CURRENT targeting is in effect is the
-- competing-truth defect this repo keeps writing rules against.
--
-- ── THE STATE, AND IT IS DELIBERATELY SMALL ────────────────────────────────────────────
--
-- Three nullable columns on "icps". No new table, no queue, no workflow engine, no tiers.
-- The ICP itself is the thing under review, so the state belongs on the ICP.
--
--     icp_review          jsonb        WHAT could not be translated, and the client's words
--     icp_review_at       timestamptz  WHEN we found out
--     icp_review_resolved_at / _by     WHO closed it, and when
--
-- 🛑 NULL EVERYWHERE = "NOTHING WAS EVER WRONG", which is the truth for every existing row
-- and for the overwhelming majority of future ones. "icpNeedsReview(null, null)" is FALSE, so
-- no existing client can be dragged into review by this migration, and no existing Proof
-- authority changes. That direction is the whole safety of the backfill: the flag is only
-- ever set FORWARD, by a promotion that actually failed to translate something.
--
-- ⚠️ THE ASYMMETRY WITH "proof_passes_legacy" IS DELIBERATE, and both are right. There, NULL
-- had to REFUSE, because guessing hands out free provider spend. Here, NULL must ADMIT,
-- because guessing the other way would freeze every live client's Proof on the day this
-- deploys over a translation problem they never had.
--
-- ⚠️ A CORRUPT OR UNREADABLE "icp_review" FAILS CLOSED, and that is decided in code
-- ("icpNeedsReview"), not here — a CHECK constraint cannot express "shaped like a review".
-- NULL is the only value this migration can create, and NULL is the safe one.
--
-- ADDITIVE AND IDEMPOTENT. Three nullable columns, one partial index, one guarded CHECK.
-- No data mutated, no backfill, no DROP, no destructive ALTER.
--
-- Also carried as a string in apps/api/src/lib/pending-migrations.ts (key
-- '20260914_icp_provider_review') and run from Vida -> Engine. Keep the two in step.
-- ═══════════════════════════════════════════════════════════════════════════════════════

alter table public.icps
  add column if not exists icp_review             jsonb,
  add column if not exists icp_review_at          timestamptz,
  add column if not exists icp_review_resolved_at timestamptz,
  add column if not exists icp_review_resolved_by uuid;

comment on column public.icps.icp_review is
  'NEEDS ICP REVIEW — the provider translation we could NOT complete, and the client''s own words for it. Shape: {"requirements":[{"field":"industries"|"seniority_levels"|"company_sizes","said":["their words","exactly as said"]}]}. NULL means nothing ever failed to translate, which is the truth for every row that predates this column and for every client whose words mapped cleanly — it is NOT a backfilled default and it grants nothing. A non-empty requirements array means Proof and provider sourcing are REFUSED until a human resolves it. A corrupt or unreadable value fails CLOSED (see icpNeedsReview in lib/icp-provider-translation.ts): the one thing we must not do with an unreadable translation state is spend money on it.';

comment on column public.icps.icp_review_at is
  'When the incomplete translation was recorded. Evidence only — authority is icp_review + icp_review_resolved_at, never a timestamp on its own.';

comment on column public.icps.icp_review_resolved_at is
  'When an operator supplied provider-safe values and the review closed. Set ONLY in the same statement that writes the canonical provider lists, so the flag can never clear without the values that justify it.';

comment on column public.icps.icp_review_resolved_by is
  'The auth user who resolved it. NOT a foreign key to auth.users, matching the existing convention for operator-attribution columns on this table: an operator account being removed must never cascade into or block a client''s ICP history.';

-- ── 🛑 THE FLAG AND ITS EVIDENCE CANNOT DISAGREE ──────────────────────────────────────
-- Guarded on pg_constraint rather than DROP + ADD: ADD CONSTRAINT ... CHECK takes an ACCESS
-- EXCLUSIVE lock and revalidates the whole table, so DROP/ADD would pay that on every run of
-- the ledger-less migration runner AND leave a window with no constraint at all.
-- SAFE ON A POPULATED TABLE: the columns are added NULL with no default and no backfill, so
-- every existing row short-circuits each predicate and validation cannot fail.
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.icps'::regclass
       and conname  = 'icps_review_resolution_shape'
  ) then
    alter table public.icps
      add constraint icps_review_resolution_shape check (
        -- A resolution may only exist for something that was actually flagged. Without this,
        -- a stray "resolved_at" on a never-flagged row would read as "a human checked this",
        -- which is a claim about a person that nobody made.
        icp_review_resolved_at is null or icp_review is not null
      );
  end if;
end $$;

-- Vida's review rail asks for ICPs that still need a human — a small, bounded set that must
-- never require a table scan. Partial, because the overwhelming majority of ICPs have NULL
-- here and always will.
create index if not exists icps_needs_review_idx
  on public.icps (icp_review_at)
  where icp_review is not null and icp_review_resolved_at is null;
