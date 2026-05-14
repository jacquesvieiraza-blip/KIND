-- Replace order_forms-based agreement tracking with T&C acceptance at payment
-- Clients accept T&Cs by ticking a checkbox before their first Paystack credit purchase

alter table public.clients
  add column if not exists terms_accepted_at  timestamptz,
  add column if not exists terms_accepted_ip  text;
