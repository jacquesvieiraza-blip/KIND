-- ═══════════════════════════════════════════════════════════════════════════════════════
-- BUILD-003 · item 7 — REPLY IDEMPOTENCY, A DATABASE BACKSTOP
--
-- ⚠️ NOT GATED BY R2 — split out from delivery_rls so the browser-access gate does not hold
-- back a duplicate-suppression guard. This file grants no browser access at all.
--
-- A provider redelivering a webhook must not create a second reply. A duplicate reply is a
-- duplicate classification, a duplicate meeting and a duplicate outcome — and outcomes are
-- what the commercial model is judged on.
--
-- ⚠️ WHY THE DATABASE AND NOT THE APPLICATION. There are three insert sites today —
-- reply-pipeline.ts:156, manual-reply.ts:114 and routes/figsy.ts:2297 — and the fourth one
-- somebody adds will not know about the other three. Application dedupe protects the paths
-- its author remembered; a unique index protects the paths nobody has written yet.
--
-- Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════════════════

-- ⚠️ provider_event_key, NOT provider_message_id — and the difference is the whole design.
--
-- `replyEventKey` (reply-ingest.ts:346) already resolves the intended hierarchy:
--
--     provider message id  →  fallback provider delivery id  →  NULL if neither exists
--
-- and namespaces the result by provider, so `smartlead:123` and `instantly:123` are
-- different events rather than a collision between two vendors' counters.
--
-- Keying the index on `provider_message_id` alone would throw away the delivery-id fallback:
-- every redelivery that carries only a delivery id would slip past the backstop, which is
-- exactly the case a webhook retry produces. The column stores the KEY the application
-- already computes, so the database protects the same identity the code reasons about
-- instead of a narrower one.
ALTER TABLE public.figsy_replies
  ADD COLUMN IF NOT EXISTS provider_event_key text;

-- ⚠️ PARTIAL, SO NULL IS DELIBERATELY FAIL-OPEN — this is a decision, not an oversight.
--
-- A reply with neither a provider message id nor a delivery id (an operator typing a manual
-- reply, a provider that sends no identifier) is NOT deduplicated. The alternative is worse:
-- keying on something synthetic like (campaign, lead, body) would silently DISCARD a real
-- second reply from a person who wrote the same short line twice — "yes", "thanks", "ok".
--
-- Losing a genuine reply is a worse failure than storing a rare duplicate, because a lost
-- reply is a lost meeting and nobody ever sees that it happened. So the backstop protects
-- exactly the case where the provider hands us something authoritative to key on, and
-- declines to guess in the case where it does not.
CREATE UNIQUE INDEX IF NOT EXISTS figsy_replies_provider_event_key_key
  ON public.figsy_replies (provider_event_key) WHERE provider_event_key IS NOT NULL;

COMMENT ON COLUMN public.figsy_replies.provider_event_key IS
  'Provider-namespaced event key from replyEventKey() — message id, else delivery id, else NULL. Unique when present; NULL is deliberately NOT deduplicated (see 20260829_reply_idempotency.sql).';
