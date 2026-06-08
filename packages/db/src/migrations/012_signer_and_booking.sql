-- Migration 012 — configurable email sign-off name (P-a) + booking link field (CAL-min)
-- Run once against Supabase (SQL Editor). Additive + idempotent — safe to re-run.
--
-- P-a: clients can set the exact name FIGSY signs outreach as, instead of FIGSY
--      inventing a South-African-sounding first name. NULL = keep old behaviour.
-- CAL-min: booking_url already exists in most environments; added here defensively
--      so non-Google clients can paste any booking link (Calendly/Zoho/etc.).

alter table public.clients
  add column if not exists signer_name text,
  add column if not exists booking_url text;
