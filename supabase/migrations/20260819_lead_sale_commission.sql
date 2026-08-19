-- PARTNER COMMISSION MOVES TO THE LEAD SALE (19 Aug 2026, founder-locked)
--
-- THE RULING, in his words:
--   "no 25% does not include the $299 nor the 100 leads we give. its everything after this
--    or above this"
--   "lifetime. if they looking after their client its theirs."
--   "she earns on leads purchased not when they top up. because our calulators on leads not
--    money in. we earn money when they buy leads. so thye need to be managing their
--    customers to buy leads."
--
-- WHAT CHANGED IN THE CODE. Commission used to fire on three Stripe events (pack checkout,
-- credit-bundle top-up, subscription renewal) — money ARRIVING. It now fires on the $4
-- approval charge instead, which is a wallet deduction and never touched Stripe at all.
--
-- WHAT THIS MIGRATION IS FOR. Two things the new path needs from the schema:
--
--   1. commission_type is CHECK-constrained to ('land','retain'). A lead sale is neither,
--      so the insert would be rejected outright. The constraint widens to include
--      'lead_sale'. The two existing values stay — nothing is renamed and no row is touched,
--      because deleting a type would rewrite history that a statement is derived from.
--
--   2. stripe_ref is the idempotency column, and its partial unique index
--      (partner_id, stripe_ref) is the REAL double-pay guard (#351's fix — the app-level
--      check is only a fast path in front of it). A lead sale has no Stripe reference, so it
--      writes 'lead:<lead_id>' — the SAME reference the $4 ledger row uses. That makes the
--      guard cover the new path exactly as it covered the old one: one commission per lead,
--      ever, enforced by the database rather than by a read-then-write the app could race.
--      The column keeps its name (renaming it would break every reader) and gets a COMMENT
--      so the next person is not misled by it.
--
-- NOTHING NEEDS BACKFILLING. No client has ever paid, so partner_commissions has never had
-- a row. This is a schema widening on an empty table.
--
-- IDEMPOTENT. The constraint is dropped only if present and recreated with the same name;
-- the comment is unconditional and overwrites. A second run changes nothing.

-- 1 - widen the type so a lead-sale commission can be written at all
alter table public.partner_commissions
  drop constraint if exists partner_commissions_type_check;

alter table public.partner_commissions
  add constraint partner_commissions_type_check
  check (commission_type in ('land', 'retain', 'lead_sale'));

-- 2 - say what the reference column actually holds now
comment on column public.partner_commissions.stripe_ref is
  'The reference of the EARNING EVENT, and the idempotency key behind the partial unique (partner_id, stripe_ref). Historically a Stripe session/invoice id; since 19 Aug 2026 a lead-sale commission writes ''lead:<lead_id>'', the same reference the $4 credit_transactions row uses, so one lead can never pay twice. Not Stripe-only despite the name - renaming it would break every reader.';

comment on column public.partner_commissions.commission_type is
  'land = the one-time acquisition fee (legacy MRR plan) - retain = the recurring book fee (legacy MRR plan) - lead_sale = 25% of a $4 approved lead, the live model from 19 Aug 2026. The two legacy values are kept because statements are derived from historical rows.';
