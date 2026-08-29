-- ═══════════════════════════════════════════════════════════════════════════════════════
-- BUILD-003 · item 6 (completion) — PROVIDER-SIDE EVICTION, AS A TRACKED BLOCKER
--
-- ⚠️ NOT GATED BY R2 — four nullable columns and one partial index, no browser access.
--
-- THE GAP THE SEND GATE DOES NOT CLOSE. `lib/send-gate.ts` refuses any NEW K.I.N.D send to a
-- suppressed person. It can do nothing about a person who was already pushed into a provider
-- BEFORE they opted out: Smartlead sends from its own engine with its own copy of the lead,
-- so our chokepoint never runs for them again. A pre-send gate is necessary and is not
-- sufficient.
--
-- WHAT EXISTS TODAY, STATED HONESTLY: `alertSmartleadStillSending` reads
-- `leads.smartlead_campaign_id` and emails the founder a list of people to remove by hand.
-- It ONLY ALERTS. It stops no delivery. Founder-ruled 20 Aug — *"yes alert not api"* — because
-- api.smartlead.ai returns 403 from this environment, so no remove endpoint could be
-- confirmed and writing one would be guessing at an API that touches real people.
--
-- That ruling stands and this does not overturn it. What it fixes is that an EMAIL IS NOT A
-- TRACKED BLOCKER: if it fails to send, lands in spam, or is simply missed, nothing anywhere
-- records that a suppressed person is still sitting in a live campaign. The risk was real,
-- unresolved, and invisible.
--
-- So the blocker is PERSISTED on the lead. It is raised automatically at the moment of
-- suppression, it stays raised until an operator confirms the removal, and it can be listed.
-- ⚠️ IT DOES NOT CLOSE THE RISK — it makes the risk countable. That distinction is the whole
-- point, and the operator surface must say so in those words rather than implying it is
-- handled.
--
-- ⚠️ NO LEGAL OR COMPLIANCE CLAIM. This is an operational control. It asserts nothing about
-- sufficiency under any regime, and #704 remains unresolved and untouched.
--
-- Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS provider_eviction_required_at timestamptz;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS provider_eviction_provider text
    CHECK (provider_eviction_provider IS NULL OR provider_eviction_provider IN ('smartlead', 'instantly'));

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS provider_eviction_reason text;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS provider_evicted_at timestamptz;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS provider_evicted_by text;

-- The operator's queue: raised and not yet cleared. Partial, because the overwhelming
-- majority of leads have never been pushed to a provider at all — and this index is what
-- makes "who is still in a campaign after opting out?" a question with an instant answer
-- rather than a table scan nobody runs.
CREATE INDEX IF NOT EXISTS leads_provider_eviction_pending_idx
  ON public.leads (provider_eviction_required_at)
  WHERE provider_eviction_required_at IS NOT NULL AND provider_evicted_at IS NULL;

COMMENT ON COLUMN public.leads.provider_eviction_required_at IS
  'BUILD-003 item 6: this person is suppressed AND was already inside a provider that sends from its own copy. Raised automatically on suppression; cleared only when an operator confirms removal. A raised blocker means delivery may still be happening — it records the risk, it does not close it.';
