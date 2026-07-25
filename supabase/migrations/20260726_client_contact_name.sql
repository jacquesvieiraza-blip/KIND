-- WHO WE'RE SPEAKING TO (flow v2, step 0 — founder-locked 25 Jul).
--
-- Sign-up asks for a company, an industry, a country and a website, and never once asks
-- who the human on the other end is. Vida even lists "who we're speaking to" as an
-- onboarding gap, so it could never go green — nothing collected it.
--
-- Deliberately NOT signer_name: that is who SIGNS the outgoing emails (often a founder or
-- an SDR persona). This is who we call when something needs a decision.
--
-- Safe to run twice. Additive only — no data is touched, nothing can break by applying it.
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS contact_name text;

COMMENT ON COLUMN public.clients.contact_name IS
  'Who we are speaking to at this client (flow v2 step 0). Not signer_name, which is who signs outbound email.';
