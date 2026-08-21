-- ── THE MEETING BRIEF (P34 v1, 21 Aug 2026) ─────────────────────────────────────────
--
-- ONE canonical, versioned, CLIENT-LEVEL record of what we understand about a client:
-- who they want to reach, what they sell, who to avoid, what proof to lead with. FIGSY's
-- scoring prompt and the sequence generator read the approved version as ADDITIVE context,
-- so "she learns what good looks like" stops being a slogan and becomes a row.
--
-- "Meeting Brief" is the product name for this CLIENT-level brief. It is NOT a brief about
-- an individual booked meeting.
--
-- ⚠️ WHAT v1 IS ASSEMBLED FROM, AND THE SOURCE THAT TURNED OUT NOT TO EXIST.
-- The build brief put the Milla onboarding conversation first: "the product already uses
-- that conversation to learn/propose the ICP". It does — but only in flight. /milla/welcome
-- holds the transcript in React state, posts it to /icps/builder/chat (stateless: the
-- messages arrive in the request and NOTHING is written), and on approval posts only the
-- finished ICP to POST /icps. The conversation is discarded. There is no db write anywhere
-- on that path. So v1 is derived from the sources that DO persist:
--     the active ICP -> figsy_knowledge (pitch/messaging) -> P32 lead_feedback
-- Founder-ruled 21 Aug, given the choice between building on what exists and capturing
-- transcripts first: build on what exists now. Capturing the welcome conversation is a
-- separate change with its own privacy surface.
--
-- ⚠️ VERSIONS ARE IMMUTABLE IN CONTENT, AND THAT IS WHY THERE IS NO UPDATE PATH FOR TEXT.
-- An edit INSERTS version+1. No route updates a content column, no route deletes a row, and
-- the only UPDATE that exists at all flips a draft to approved — metadata, never words. A
-- client who corrects the brief can always see what they corrected.
--
-- ⚠️ "SUPERSEDED" IS DERIVED, NOT STORED, AND THAT IS DELIBERATE.
-- The authoritative brief is: the HIGHEST version for this client whose status is
-- 'approved'. Any older approved row is therefore superseded by construction. The
-- alternative — flipping old rows to a 'superseded' status when a new one lands — needs two
-- writes to stay consistent, and PostgREST cannot wrap them in a transaction: a failure
-- between them leaves a client with either two live briefs or none. Deriving it means every
-- operation here is a SINGLE atomic row write.
--   ⚠️ Note this is NOT "MAX(version) wins", which the build brief rightly warns against —
--   a draft sitting at version 4 must never become consumer context. The status filter is
--   the whole difference and it is not optional in any read.
--
-- ⚠️ THE BRIEF IS EVIDENCE, NEVER PERMISSION.
-- Its geography field records what the client WANTS to target. It cannot widen the launch
-- allowlist, PECR eligibility, suppression, the approval gate or any send gate — those are
-- independent and this table is not wired to any of them. It reaches exactly two prompts.

create table if not exists public.meeting_briefs (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid not null references public.clients(id) on delete cascade,
  version           integer not null,

  -- 'draft'    — assembled but not yet confirmed by the client. NEVER consumer context.
  -- 'approved' — the client confirmed it (or wrote it themselves, which is the same act:
  --              founder-ruled 21 Aug that the CLIENT approves their own brief).
  status            text not null default 'draft'
                      check (status in ('draft', 'approved')),

  -- Content. Every field nullable ON PURPOSE: the evidence rule says an unsupported field
  -- stays EMPTY. A brief that invents a proposition to look complete is worse than one with
  -- three fields filled and the rest honestly blank.
  objective         text,
  ideal_accounts    text,
  target_personas   text,
  exclusions        text,
  proposition       text,
  proof_points      text,
  strong_signals    text,
  anti_signals      text,
  geography         text,
  meeting_objective text,

  -- Which source each populated field came from, e.g. {"target_personas":"icp"}. Without
  -- this a client asking "where did you get that?" has no answer, and a field derived from
  -- evidence is indistinguishable from one a model made up.
  provenance        jsonb not null default '{}'::jsonb,

  -- 'client' for every row today. Recorded rather than assumed so the day an operator can
  -- approve one, old rows still say truthfully who approved them.
  approved_by       text,
  approved_at       timestamptz,
  created_at        timestamptz not null default now()
);

-- CONCURRENCY. Two tabs editing at once both read "current version is 2" and both write 3.
-- The database is the only place they can be made to disagree: the loser gets 23505 and is
-- told to re-read. Same reasoning as the cron slot claim (#343) and P33's brief index.
create unique index if not exists meeting_briefs_client_version_idx
  on public.meeting_briefs (client_id, version);

-- The consumer read: newest approved brief for a client, in one index hit.
create index if not exists meeting_briefs_client_approved_idx
  on public.meeting_briefs (client_id, version desc)
  where status = 'approved';

-- Service-role only. The API scopes every read and write by client_id; enabling RLS with no
-- policy means nothing else reaches this table at all.
alter table public.meeting_briefs enable row level security;

comment on table public.meeting_briefs is
  'P34 - the client-level Meeting Brief. Versions are immutable in content; an edit inserts version+1. The authoritative brief is the highest version with status=approved. Evidence only: it reaches the FIGSY scoring prompt and the sequence generator, and never a gate.';
