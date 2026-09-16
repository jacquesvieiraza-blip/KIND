-- ═══════════════════════════════════════════════════════════════════════════════════════
-- ⚑ 17 Sep — THE AMBIGUOUS REPLY GETS A DURABLE HOME.
--
-- ── 🛑 WHY THIS EXISTS ─────────────────────────────────────────────────────────────────
--
-- 16 Sep closed the cross-client fan-out: a reply whose prospect address is held by two
-- clients, with no receiving mailbox and no originating-send evidence, is now written to
-- NOBODY. That is the correct safety answer and it created a second defect in its place.
--
-- The inbound content lived only in process memory. Resend's `email.received` webhook is
-- METADATA-ONLY, so the body is fetched from their API into a local variable; the dedup
-- ledger (`processed_webhook_events`) stores an id and a source and nothing else. So the
-- ambiguous path was: accept the webhook, record the dedup claim, fetch the body, refuse to
-- attribute it, email an alert, answer 200 — and the reply itself was gone. The provider
-- will not redeliver, because we told it we had the event.
--
-- A privacy leak was replaced with silent data loss. This table is the fix.
--
-- ── ⚠️ WHY NOT `figsy_replies` ──────────────────────────────────────────────────────────
--
-- `figsy_replies.client_id`, `.lead_id` and `.campaign_id` are all NOT NULL and have been
-- since 002_figsy.sql. An unattributed reply has no client by definition, so parking it
-- there would mean either relaxing those constraints — the very columns that make one reply
-- belong to one client — or inventing a placeholder client, which is a guess wearing a
-- fact's clothes. It gets its own table precisely so that nothing client-visible exists
-- until a human names the owner.
--
-- ── ⚠️ WHY `UNIQUE (provider, provider_event_key)` AND NOT THE KEY ALONE ────────────────
--
-- Event ids are PROVIDER-SCOPED. Smartlead message "123" and Instantly message "123" are two
-- different emails, and a global unique on the key alone would let one provider's reply
-- silently suppress the other's — the identical trap `replyEventKey` was written to avoid by
-- namespacing. NULL is deliberately not deduplicated: an operator-typed or demo reply has no
-- provider event, and a NULL key that collided would drop the second real one.
-- ═══════════════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.unattributed_replies (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- WHERE IT CAME FROM. `provider` is `replyEventKey`'s namespace: resend | smartlead |
  -- instantly. `provider_event_key` is the exact value the route deduped on, so the retention
  -- row and the dedup ledger agree about what "the same reply" means.
  provider              text        NOT NULL,
  provider_event_key    text,

  -- THE COMPLETE INBOUND EVIDENCE. `body` is NOT NULL because a retained reply with no
  -- content is not evidence of anything — the whole point is that a human can read it and
  -- decide. `raw_payload` keeps the provider's own object verbatim for forensics.
  from_email            text        NOT NULL,
  from_name             text,
  to_email              text,
  subject               text,
  body                  text        NOT NULL,
  raw_payload           jsonb,

  -- THE CANDIDATES, AS THEY WERE AT INGEST. Stored rather than re-derived: leads move,
  -- programmes end, and a resolution months later must be checked against the set that
  -- actually existed when the reply arrived. This is what makes "the chosen client must have
  -- been a candidate" enforceable at all.
  candidate_client_ids  uuid[]      NOT NULL,
  candidate_lead_ids    uuid[]      NOT NULL,

  received_at           timestamptz NOT NULL DEFAULT now(),

  -- ⚑ THE CLAIM, AND IT IS NOT THE RESOLUTION.
  --
  -- 🛑 TWO OPERATORS PRESSING AT ONCE MUST NOT PRODUCE TWO REPLIES, and an attribution that
  -- FAILS must leave the exception recoverable. One column cannot do both: marking resolved
  -- before processing risks a resolved exception with no reply, and marking after risks two
  -- replies. So the claim is taken first (compare-and-set on NULL), the reply is written, and
  -- only then is the resolution recorded. A failed attribution RELEASES the claim.
  resolve_claimed_at    timestamptz,
  resolve_claimed_by    text,

  -- THE OUTCOME. `attributed` = a human named one of the stored candidates and the reply was
  -- written to them. `discarded` = a human confirmed it belongs to none of them.
  resolved_at           timestamptz,
  resolved_client_id    uuid REFERENCES public.clients(id),
  resolved_by           text,
  resolution            text CHECK (resolution IN ('attributed', 'discarded')),

  -- 🛑 THE TWO HALVES OF AN OUTCOME CANNOT DISAGREE. A row carrying `resolution` with no
  -- `resolved_at` (or the reverse) is a state no reader could interpret, and an `attributed`
  -- row with no client is the guess this whole table exists to prevent.
  CONSTRAINT unattributed_replies_resolution_complete CHECK (
    (resolved_at IS NULL AND resolution IS NULL AND resolved_client_id IS NULL)
    OR (resolved_at IS NOT NULL AND resolution = 'discarded')
    OR (resolved_at IS NOT NULL AND resolution = 'attributed' AND resolved_client_id IS NOT NULL)
  )
);

-- One retained row per provider event. See the header for why the provider is part of it.
CREATE UNIQUE INDEX IF NOT EXISTS unattributed_replies_provider_event_key
  ON public.unattributed_replies (provider, provider_event_key)
  WHERE provider_event_key IS NOT NULL;

-- The operator feed's only query: what is still waiting on a person. Partial, because the
-- answer is the handful actually owed and never the whole history.
CREATE INDEX IF NOT EXISTS unattributed_replies_open_idx
  ON public.unattributed_replies (received_at)
  WHERE resolved_at IS NULL;

-- Enabled with NO policy: the API uses the service role, which bypasses RLS, and every other
-- role is denied by default. A client can never read an inbound reply that was never
-- attributed to them — which is the isolation this table was built to preserve.
ALTER TABLE public.unattributed_replies ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.unattributed_replies IS
  'An inbound reply whose owner could not be determined safely: several clients hold a lead with that prospect address, no receiving mailbox names one, and no originating-send record names one. Retained in full, visible to nobody, until an operator attributes it to one of its stored candidates or discards it. NEVER a client-visible reply — that is figsy_replies.';
