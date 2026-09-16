-- ═══════════════════════════════════════════════════════════════════════════════════════
-- ⚑ 16 Sep (MVP1 · C1b) — ONE MAILBOX CANNOT BE LIVE ON TWO CLIENTS.
--
-- ── 🛑 WHY THIS MIGRATION IS NECESSARY, AND WHY IT IS THE ONLY ONE IN THIS BUILD ────────
--
-- `20260725_client_inboxes.sql` created exactly one unique index:
--
--     CREATE UNIQUE INDEX client_inboxes_one_live_per_kind
--       ON public.client_inboxes(client_id, kind)
--       WHERE status IN ('assigned','warming','active');
--
-- That is a rule about ONE CLIENT: it stops a single client holding two live pooled inboxes.
-- It says NOTHING about one ADDRESS being live on two DIFFERENT clients — and that is the
-- rule that matters the moment mailboxes are handed out automatically.
--
-- `lib/programme-sender.ts` has always known this. Its own comment says *"`client_inboxes` is
-- keyed per client, so nothing stops the same address being attached to"* another one, and it
-- compensates with a RUNTIME READ that looks for the address on other clients. That read is a
-- check-then-act: two preparations running at the same moment both read "free" and both
-- insert. With an operator typing addresses by hand that race was theoretical. With
-- preparation claiming senders automatically it is the normal case — two programmes reaching
-- the sender step together is exactly what a queue does.
--
-- ⚠️ SO THE EXISTING CONSTRAINT DOES NOT PROVE IT, which is the founder's own test for whether
-- a migration is warranted: *"if an existing unique constraint proves that safely, reuse it.
-- otherwise add only the smallest DB constraint/migration required."* This is that constraint,
-- and it is the whole of it.
--
-- ── WHAT IT DOES, AND WHAT IT CAREFULLY DOES NOT ───────────────────────────────────────
--
-- ⚠️ ADDITIVE ONLY. One index. Nothing is dropped, altered, renamed or deleted; no column
-- changes type; no row is touched. The existing per-kind index stays exactly as it is — the
-- two rules are different and both are wanted.
--
-- ⚠️ SCOPED TO LIVE ROWS, AND THAT IS WHAT MAKES IT SAFE TO ADD. `released` and `retired`
-- rows are history: a mailbox handed from one client to the next legitimately appears many
-- times, and a full unique index would refuse that and destroy the audit trail. Only rows in
-- play are constrained.
--
-- ⚠️ LOWER(email), because a mailbox is not case-sensitive and `Outreach1@…` and
-- `outreach1@…` are one inbox. The claim path normalises to lower case before inserting; this
-- index is what makes that a guarantee rather than a convention.
--
-- 🛑 IF IT CANNOT BE CREATED, THE DATA ALREADY VIOLATES IT. A duplicate live address is a
-- real defect — two clients sending from one mailbox — and the create failing is how it gets
-- discovered. Resolve the duplicates (release one), then re-run. It is deliberately NOT
-- written as a nullable/soft check that would hide that.
-- ═══════════════════════════════════════════════════════════════════════════════════════

CREATE UNIQUE INDEX IF NOT EXISTS client_inboxes_one_live_per_email
  ON public.client_inboxes (lower(email))
  WHERE status IN ('assigned', 'warming', 'active');

COMMENT ON INDEX public.client_inboxes_one_live_per_email IS
  'MVP1 C1b: one mailbox address may be LIVE on at most one client. Scoped to assigned/warming/active so released and retired history can reuse an address. This is the arbiter for automatic pooled-sender claims — the application read that preceded it was a check-then-act race.';
