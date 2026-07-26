-- MAILBOX SMTP DETAILS — #547/#548, the sending spine.
--
-- Founder-locked 26 Jul: **option B**. The provider (Smartlead for clients, Instantly for
-- us) still buys and warms the mailbox; WE press send through it. The reason B won: every
-- part of the sending brain is already built and tested — the sequence engine, the send
-- window, the daily caps, the A/B subjects, the kill-switch, the reply classifier. Option A
-- (hand the lead to the provider's campaign engine) would have put a second brain in charge
-- of when an email goes out. B changes the `From:` and the connection, and nothing else.
--
-- B's cost is this table holding one mailbox password per client, so:
--   • `smtp_pass_enc` is AES-256-GCM ciphertext ONLY — `v1:<iv>:<tag>:<body>`, encrypted
--     with INBOX_SECRET_KEY (see apps/api/src/lib/inbox-secret.ts). Plaintext must never be
--     written here, and no API surface may ever return this column.
--   • no key on the API = no decryption = **no send**. Fail closed. The one thing that must
--     never happen is falling back to our shared sending address, because one client's spam
--     complaints then poison every other client (RULEBOOK 12.2).
--
-- `from_name` is the display name only. The ADDRESS on the From header is always
-- `client_inboxes.email` — the mailbox we are actually authenticated as. A mismatch between
-- the authenticated user and the From address is what receiving servers read as spoofing.
--
-- Additive and idempotent. Safe to re-run.

ALTER TABLE public.client_inboxes
  ADD COLUMN IF NOT EXISTS smtp_host     text,
  ADD COLUMN IF NOT EXISTS smtp_port     integer,
  ADD COLUMN IF NOT EXISTS smtp_secure   boolean,
  ADD COLUMN IF NOT EXISTS smtp_user     text,
  ADD COLUMN IF NOT EXISTS smtp_pass_enc text,
  ADD COLUMN IF NOT EXISTS from_name     text;

COMMENT ON COLUMN public.client_inboxes.smtp_pass_enc IS
  'AES-256-GCM ciphertext (v1:iv:tag:body) of the mailbox password, encrypted with INBOX_SECRET_KEY. NEVER plaintext, and never returned by any API surface.';
COMMENT ON COLUMN public.client_inboxes.from_name IS
  'Display name on the From header. The ADDRESS is always client_inboxes.email — a mismatch reads as spoofing to the receiving server.';
