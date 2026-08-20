-- HC-3 — RECORD WHICH LEADS ARE INSIDE A SMARTLEAD CAMPAIGN.
--
-- Smartlead is the R25 month-one send path for every new client, and SMARTLEAD'S OWN ENGINE
-- does the sending. Once a lead is pushed there, our send chokepoint never runs for it again.
--
-- So when that person opts out, adding them to `opt_out_blocklist` stops OUR sends and does
-- NOTHING to Smartlead — which keeps its own copy of the lead and keeps emailing them. The only
-- way to stop it is to remove them inside Smartlead, and you cannot remove someone you cannot
-- name.
--
-- Nothing recorded the membership: `pushApprovedLeadToSmartlead` returned the campaign id and
-- `approve-lead.ts` discarded it. This column is what makes the opt-out alert able to say WHO
-- to remove and FROM WHICH campaign, instead of "somebody, somewhere".
--
-- Nullable and unindexed on purpose: it is null for every lead that has never been pushed
-- (which today is all of them — Smartlead is unpurchased and returns 401), and it is read one
-- lead at a time on the suppression path, never scanned.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS smartlead_campaign_id text;

COMMENT ON COLUMN public.leads.smartlead_campaign_id IS
  'HC-3: the Smartlead campaign this lead was pushed into, or NULL if never pushed. Set only after addLeads succeeds. Read on opt-out so the alert can name the campaign a person must be removed from — our blocklist does not stop Smartlead sending.';
