-- 20260815_client_partner_seat.sql — R40, the Client Partner seat (founder-ruled 15 Aug).
--
-- THREE inventory bugs and one new seat, in one idempotent migration.
--
-- #220 — the earnings backend. `partner_commissions` stored a flat amount with NO TYPE and
--        no way to tell a one-off landing fee from a recurring retention payment. A live
--        earnings view on top of that is the fake-dashboard trap (#136a): it would have to
--        guess which rows meant what. `commission_type` makes the statement derivable.
--
-- #351 — the double-pay. The app checked (partner, client, period) before inserting, but
--        NOTHING enforced it in the database, so two concurrent Stripe webhooks could both
--        pass the check and both insert. The unique index below is the real guard; the app
--        check is now only a fast path. It is keyed WITH commission_type because month one
--        legitimately carries BOTH a land and a retain row for the same client.
--
-- R40  — the seat itself. `seat_type` distinguishes a Client Partner (sells AND runs
--        customer success, 8% retain) from a legacy referral partner (5%). The rate lives
--        on the SEAT so the comp engine never hard-codes a person's pay.
--
-- ⚠️ `amount_usd` is added defensively: `routes/stripe.ts` has been WRITING that column
-- since the USD move, but no migration ever created it (the #380 class — code writing a
-- column no migration declares). If production already has it, this is a no-op.

-- ── the seat ────────────────────────────────────────────────────────────────────────
alter table public.partners
  add column if not exists seat_type text not null default 'partner';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'partners_seat_type_check'
  ) then
    alter table public.partners
      add constraint partners_seat_type_check
      check (seat_type in ('partner', 'client_partner'));
  end if;
end $$;

-- The retention rate this seat earns, as a fraction. NULL = fall back to the plan default
-- (0.05), so every existing partner keeps exactly the deal they already had.
alter table public.partners
  add column if not exists retain_rate numeric(5,4);

-- ── the earnings backend (#220) ─────────────────────────────────────────────────────
alter table public.partner_commissions
  add column if not exists amount_usd numeric(10,2);

alter table public.partner_commissions
  add column if not exists commission_type text not null default 'land';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'partner_commissions_type_check'
  ) then
    alter table public.partner_commissions
      add constraint partner_commissions_type_check
      check (commission_type in ('land', 'retain'));
  end if;
end $$;

-- ── the double-pay guard (#351) ─────────────────────────────────────────────────────
-- ⛓️ Re-designed during Fable verification (16 Aug), before this ever ran anywhere.
-- The first design was UNIQUE (partner, client, period, type) — one commission row per
-- month. But the checkout handler serves wallet TOP-UPS as well as the pack, so a client
-- can legitimately pay several times in a month, and one-row-per-month silently dropped
-- the retain on every payment after the first: the over-pay became an under-pay.
--
-- The real identity of a commission is THE PAYMENT THAT EARNED IT. So:
--   • one row per Stripe payment, deduped by its reference — a replayed webhook hits the
--    partial unique below and loses at the database, which is the actual #351 guard;
--   • months are derived by summing rows per period (the portal already does);
--   • the landing fee is DB-enforced once per client, ever, by its own partial unique.
alter table public.partner_commissions
  add column if not exists stripe_ref text;

create unique index if not exists partner_commissions_once_per_payment
  on public.partner_commissions (partner_id, stripe_ref)
  where stripe_ref is not null;

create unique index if not exists partner_commissions_land_once
  on public.partner_commissions (partner_id, client_id)
  where commission_type = 'land';

-- Statements are read per seat per month; this is the index that query rides.
create index if not exists partner_commissions_seat_period
  on public.partner_commissions (partner_id, period_month);
