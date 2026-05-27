-- Add stripe_subscription_id to subscriptions table
-- Used to track Stripe recurring subscriptions for Milla + Vida
-- and to handle cancellation/update webhooks correctly.

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

CREATE INDEX IF NOT EXISTS subscriptions_stripe_id_idx
  ON public.subscriptions (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;
