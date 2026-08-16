-- ── THE SELLER RAMP (#654) — a seller's own notebook, and the scoreboard built from it ──
--
-- Founder, 16 Aug: "being a partner, an employed AE os customer success, makes no difference
-- who. just an onboarding. my experience is getting someone to sign up to sell is easy.
-- keeping them enagged and selling is another thing."
--
-- The diagnosis this table serves: a commission-only seller's only scoreboard is money, and
-- money takes about six weeks. For those six weeks every screen they open says zero, which
-- reads as failure even when they are doing everything right. These rows are the OTHER
-- scoreboard — the work they actually control — and the source of the ramp gates.
--
-- ⚠️ THIS IS A NOTEBOOK, NEVER LEAD-GEN. R40: a partner works their OWN network only. Every
-- row here is typed by the seller about somebody they already know. Nothing in the product
-- may source, enrich or buy a name into this table.
--
-- ⚠️ PERSONAL DATA (POPIA / UK GDPR). These are real people's names and companies, held by
-- the seller for the seller. The operator's console shows COUNTS ONLY — never the names —
-- because "her own network" means the network belongs to her. Deleting a seat cascades these
-- rows away with it.
--
-- ⚠️ BOTH HOMES (O3): this file is the canonical record; the entry in
-- apps/api/src/lib/pending-migrations.ts is the only thing that ever EXECUTES.

create table if not exists public.partner_ramp_contacts (
  id               uuid primary key default gen_random_uuid(),
  partner_id       uuid not null references public.partners(id) on delete cascade,
  name             text not null,
  company          text,
  note             text,
  -- The stamps are the scoreboard. Each is set server-side with now() when the seller says
  -- the thing happened — never a timestamp supplied by the browser, or the ramp becomes a
  -- number anybody can type rather than a record of work done.
  ask_sent_at      timestamptz,
  conversation_at  timestamptz,
  demo_booked_at   timestamptz,
  became_client_id uuid,
  created_at       timestamptz not null default now()
);

create index if not exists partner_ramp_contacts_partner_idx
  on public.partner_ramp_contacts (partner_id);
