-- #340 (AR-03) — THE STATUSES A SUBSCRIPTION CAN HONESTLY BE IN.
--
-- `routes/stripe.ts` decided a subscription's status like this:
--
--     const status = sub.status === 'active' || sub.status === 'trialing' ? sub.status : 'active'
--
-- Read the false branch. Everything that was not already good was written as `active` —
-- Stripe's `incomplete` (the card was declined at signup and the subscription never started),
-- `past_due`, `unpaid`, `canceled`, `incomplete_expired`. Every consumer gates on
-- `.eq('status','active')` or `.in('status',['active','trialing'])`, so that single ternary
-- was the entire authorisation decision for the paid product, and it always said yes.
--
-- It also undid the dunning: `invoice.payment_failed` correctly writes `past_due`, and the
-- `customer.subscription.updated` event that arrives alongside it carried `past_due` straight
-- back through the ternary and out as `active`.
--
-- ⚠️ LIVE SCHEMA = ENUM, exactly as #190 discovered. Production `subscriptions.status` is a
-- Postgres enum type (`subscription_status`), NOT the text+CHECK column the repo's schema.sql
-- claims — that file drifted from production. The earlier CHECK-based attempt failed in prod
-- with: invalid input value for enum subscription_status: "paused". #342 is the same bug
-- still live, for `lapsed`.
--
-- So mapping Stripe faithfully REQUIRES these values to exist first. Without them the honest
-- fix fails the same way, and a failed UPDATE leaves the row on its previous value — which
-- for an existing subscription means it stays `active`. The application carries a fallback
-- for that window (see lib/subscription-status.ts); this migration closes it.
--
-- Idempotent. `ADD VALUE IF NOT EXISTS` is a no-op when the value is already present.
--
-- NOTE: the new values are deliberately NOT referenced anywhere in this file — Postgres
-- forbids using an enum value in the same transaction that adds it.
--
-- Also carried as a string in apps/api/src/lib/pending-migrations.ts (key
-- '20260727_subscription_status') and run from Vida → Engine, because the Supabase SQL
-- editor is unreachable. Keep the two in step.

ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'incomplete';
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'incomplete_expired';
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'unpaid';
