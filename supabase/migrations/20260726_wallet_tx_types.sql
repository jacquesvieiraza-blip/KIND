-- THE LEDGER MUST ACCEPT THE TYPES THE MONEY MODEL ACTUALLY WRITES.
--
-- `20260603_schema_reconcile.sql` set credit_transactions_type_check to:
--   purchase · credit_purchase · referral · referral_bonus · trial_bonus ·
--   consumed · usage · manual_grant · refund
--
-- The ONE WALLET model (24 Jul) then started writing three types that are NOT in that list:
--   • wallet_topup   — stripe.ts, on every $99 / top-up
--   • wallet_charge  — approve-lead.ts + figsy.ts, on every $4 taken
--   • wallet_reverse — figsy.ts, on every reversal
--
-- Payments demonstrably work in production, so the constraint must have been widened by
-- hand back when the SQL editor was reachable — which means the repo's migrations no
-- longer describe the live database. That is a landmine: re-running the 20260603 file
-- would DROP the widened constraint and restore the narrow one, and every wallet
-- transaction in the product would start failing.
--
-- This makes the repo tell the truth, and is safe either way:
--   • if production is already widened, this is a no-op that pins it
--   • if it is not, this is the fix
--
-- Idempotent. No data is touched.
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'credit_transactions_type_check') then
    alter table public.credit_transactions drop constraint credit_transactions_type_check;
  end if;
end $$;

alter table public.credit_transactions
  add constraint credit_transactions_type_check
  check (type in (
    'purchase','credit_purchase',
    'referral','referral_bonus',
    'trial_bonus',
    'consumed','usage',
    'manual_grant','refund',
    -- ONE WALLET (24 Jul)
    'wallet_topup','wallet_charge','wallet_reverse'
  ));
