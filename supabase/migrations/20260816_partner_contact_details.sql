-- ── PARTNER CONTACT DETAILS — so a contract can be TAILORED, not filled in by hand ──────
--
-- Founder review of the document pack, 16 Aug:
--   "when we sign up a partner. they give us their address, mobile number etc and when we
--    sign them up each document is tailored to them. i should not need to fill anything out.
--    almost like an onboarding process for a partner."
--
-- The pack already generates per seat, but the party line read "[ADDRESS], [COUNTRY]" and
-- "Dated: [DATE]" — placeholders a human had to fill in after the fact, on every document,
-- for every seat. These three columns are what turns seat creation into onboarding.
--
-- All nullable ON PURPOSE. Legacy seats (the referral partners who predate this) have none,
-- and back-filling a contract detail with a guess is worse than leaving the placeholder
-- visible — so the generator keeps the bracket when a field is missing.
--
-- ⚠️ BOTH HOMES (O3): this file is the canonical record; the entry in
-- apps/api/src/lib/pending-migrations.ts is the only thing that ever EXECUTES.

alter table public.partners
  add column if not exists address text;

alter table public.partners
  add column if not exists country text;

alter table public.partners
  add column if not exists phone text;
