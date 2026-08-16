-- ── THE PARTNER ONBOARDING FLOW — invite → pack → she signs → he signs → live ───────────
--
-- Founder-ruled 16 Aug: "i create the partner seat. it should send them an email notifying
-- them. they then sign up and complete their information pack. this renders all docs. they
-- sign. i recieve docs i sign and they then go live on partner. once they have this they are
-- notified."
--
-- The lock this encodes (R42): NO LIVE PARTNER WITHOUT BOTH SIGNATURES. Until today a seat
-- was born active with a working referral code the moment it was created — before anyone had
-- opened a document, let alone signed one.
--
-- ⚠️ DEFAULT 'active' IS DELIBERATE AND IS THE GRANDFATHER CLAUSE. Every row that already
-- exists (Demmy Oshodi, KIND-JACQUES, the founder's "test walk" seat) predates this flow and
-- has no signatures on file. Defaulting to 'invited' would switch off their referral codes
-- the moment this migration ran — a live money path turned off by a schema change nobody
-- read as a behaviour change. New seats are inserted 'invited' EXPLICITLY by the code.
--
-- ⚠️ BOTH HOMES (O3): this file is the canonical record; the entry in
-- apps/api/src/lib/pending-migrations.ts is the only thing that ever EXECUTES.

alter table public.partners
  add column if not exists onboarding_state text not null default 'active';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'partners_onboarding_state_check'
  ) then
    alter table public.partners
      add constraint partners_onboarding_state_check
      check (onboarding_state in ('invited', 'pack_pending', 'awaiting_countersign', 'active', 'archived'));
  end if;
end $$;

alter table public.partners
  add column if not exists invite_token text;

create unique index if not exists partners_invite_token_key
  on public.partners (invite_token)
  where invite_token is not null;

alter table public.partners
  add column if not exists invite_sent_at timestamptz;

alter table public.partners
  add column if not exists archived_at timestamptz;

-- HER payment rails. The agreement promises payment "against an invoice, by Wise transfer in
-- the partner's local currency" — without this the first payout month ends with the founder
-- chasing bank details over WhatsApp.
alter table public.partners
  add column if not exists payout_details jsonb;

-- ── WHAT WAS SIGNED, FROZEN ─────────────────────────────────────────────────────────────
--
-- The document pack is GENERATED LIVE from the billing constants, which is exactly right
-- before signing and exactly wrong afterwards: if a rate ever moves, a regenerated document
-- would silently change under an existing signature and nobody could prove what was agreed.
--
-- So the moment a person signs, the exact text they signed is copied here verbatim and never
-- touched again. The vault serves THIS once it exists, not a regeneration.
create table if not exists public.partner_signed_documents (
  id             uuid primary key default gen_random_uuid(),
  partner_id     uuid not null references public.partners(id) on delete cascade,
  doc_id         text not null,
  doc_version    text not null,
  body_snapshot  text not null,
  signed_name    text not null,
  signed_role    text not null check (signed_role in ('partner', 'company')),
  signed_at      timestamptz not null default now()
);

-- One signature per document per side: a second click must not create a second record of the
-- same agreement.
create unique index if not exists partner_signed_documents_once
  on public.partner_signed_documents (partner_id, doc_id, signed_role);

create index if not exists partner_signed_documents_partner_idx
  on public.partner_signed_documents (partner_id);
