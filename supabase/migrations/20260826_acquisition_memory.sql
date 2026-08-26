-- ── acquisition_memory — every identity K.I.N.D PAID a provider to acquire ──────
--
-- WHY THIS IS NOT lead_pool. `lead_pool.email_norm` is the PRIMARY KEY, so a paid
-- record with no email cannot be stored there at all — not a policy choice, a schema
-- impossibility. And the pool write in `runIcpJob` sits BELOW every client gate: a
-- record dropped for this client's budget cap, this client's duplicate, a DNC hit or
-- an opt-out hit was paid for and then forgotten, so the next run buys the same person
-- again. This table is the company's memory; `lead_pool` stays the CONTACTABLE
-- inventory. Founder rule (R67, 25 Aug): RETENTION IS NOT CONTACTABILITY.
--
-- ⚠️ THIS TABLE NEVER MAKES ANYONE CONTACTABLE. Nothing in the send, consent, reveal
-- or scoring path reads it. `contactable` is stored as a FACT ABOUT THE RECORD, never
-- as permission: suppression, opt-out and DNC always win, and a row here exists so we
-- remember we have already seen and paid for a person we must not contact.
--
-- ⚠️ COST IS WRITTEN ONCE. The unique key is (source, provider_id) and every write is
-- ON CONFLICT DO NOTHING, so a person re-encountered on a later run — for this client
-- or any other — never rewrites acquisition_cost_usd and never double-counts it.
--
-- ⚠️ REMEMBERING SOMEONE DOES NOT STOP A PROVIDER BILLING FOR THEM AGAIN. `buildPdlBody`
-- emits `bool.must` only — zero `must_not` — so PDL decides what to return before we
-- see it. Provider-id exclusion is OPEN RESEARCH, not something this table delivers.

CREATE TABLE IF NOT EXISTS public.acquisition_memory (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Provenance: who we bought it from, and their stable id for the person. This pair
  -- is the identity key precisely so an EMAILLESS record still has one.
  source               text        NOT NULL,
  provider_id          text        NOT NULL,

  -- What we paid, once, the first time we ever saw this identity.
  acquisition_cost_usd numeric     NOT NULL DEFAULT 0,
  acquired_at          timestamptz NOT NULL DEFAULT now(),

  -- Minimum useful identity for recognition and dedupe. Email is NULLABLE by design:
  -- a relevant person with no email is still proof of targeting fit and still cost money.
  email_norm           text,
  first_name           text,
  last_name            text,
  title                text,
  seniority            text,
  company              text,
  industry             text,
  company_size         text,
  country              text,
  linkedin_url         text,

  -- Contactability recorded SEPARATELY from retention, and never read as permission.
  -- false = we know we must not contact this person; the row still exists so we do not
  -- treat them as unknown and re-buy them.
  contactable          boolean     NOT NULL DEFAULT true,
  -- Why they are not contactable, when we know: 'suppressed' | 'opt_out' | 'dnc' | NULL.
  suppression_reason   text,

  -- Which run first paid for them. NOT ownership — this table is company-wide, and a
  -- client rejecting a record must never destroy the company's asset.
  first_seen_client_id uuid,

  notes                text
);

-- The identity key. Emailless records get one because it is (source, provider_id).
CREATE UNIQUE INDEX IF NOT EXISTS acquisition_memory_provider_key
  ON public.acquisition_memory (source, provider_id);

-- Recognise a person we already own by email, when they have one.
CREATE INDEX IF NOT EXISTS acquisition_memory_email_idx
  ON public.acquisition_memory (email_norm) WHERE email_norm IS NOT NULL;

CREATE INDEX IF NOT EXISTS acquisition_memory_acquired_idx
  ON public.acquisition_memory (acquired_at DESC);

COMMENT ON TABLE public.acquisition_memory IS
  'Company acquisition memory: every identity K.I.N.D paid a provider to acquire, retained BEFORE any client-specific gate can discard it (founder rule R67, 25 Aug). RETENTION IS NOT CONTACTABILITY — nothing in the send, consent, reveal or scoring path reads this table, and a row here never makes anyone contactable. Suppression, opt-out and DNC always override serving and contact. Identity key is (source, provider_id) so emailless paid records are retained; every write is ON CONFLICT DO NOTHING so acquisition_cost_usd is written once and never double-counted on reuse or dedupe. Client rejection does not delete rows here. OPEN: remembering an identity does NOT prove a provider will not bill for it again — provider-id exclusion is unresolved research, and retention period, privacy-policy wording and DSR treatment for retained suppressed identities are all still open.';

COMMENT ON COLUMN public.acquisition_memory.contactable IS
  'A FACT ABOUT THE RECORD, NEVER A PERMISSION. false means we know this person must not be contacted; the row is kept so we remember we have already paid for them. Serving and sending decisions are made by the suppression list, the opt-out blocklist and the send path — never by this column.';

COMMENT ON COLUMN public.acquisition_memory.acquisition_cost_usd IS
  'What we paid the FIRST time this identity was acquired. Never rewritten: the unique index on (source, provider_id) plus ON CONFLICT DO NOTHING means a re-encounter is ignored, so reuse and dedupe cannot double-count acquisition cost.';

-- ⚠️ RLS ON, NO POLICIES — DENY BY DEFAULT. Caught by `schema-drift.test.ts` before this
-- ever shipped: a table exposed to PostgREST with RLS off is readable by anyone holding
-- the public anon key, and `apps/portal` ships that key to every browser. Nothing
-- client-facing reads this table — every legitimate caller is server-side on the service
-- role, which bypasses RLS — so the correct policy set is EMPTY. A policy added here
-- later is a decision to expose company acquisition memory to a browser.
ALTER TABLE IF EXISTS public.acquisition_memory ENABLE ROW LEVEL SECURITY;
