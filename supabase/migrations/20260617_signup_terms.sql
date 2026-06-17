-- 20260617_signup_terms.sql
-- Item 186 — record signup T&C acceptance.
--
-- Today the signup T&C tick is a UI gate only; the binding consent record
-- (terms_accepted_at / terms_accepted_ip) is written at FIRST PURCHASE (credits.ts).
-- So a trial user who never pays has NO stored consent record. The founder's model
-- is two distinct consents — agree to T&C at signup, agree again to pay at purchase —
-- so we keep them in SEPARATE columns rather than overloading terms_accepted_at.
--
-- This adds signup-time consent columns, written at account creation (auth /onboard).

alter table public.clients
  add column if not exists signup_terms_accepted_at  timestamptz,
  add column if not exists signup_terms_accepted_ip  text;
