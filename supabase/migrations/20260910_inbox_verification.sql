-- ⚑ 10 Sep (I2) — DID ANYONE EVER PROVE THIS MAILBOX CAN LOG IN?
--
-- `verifyInbox` has existed since #552 and does exactly the right thing: it opens the SMTP
-- connection, authenticates, and sends nothing. `POST /operator/inboxes/:id/verify` calls it.
-- And the ANSWER WAS THROWN AWAY — written into an audit row's `detail` as a boolean nobody
-- reads, and nowhere else. So every gate in the product asked "does this row have a host, a
-- username and a password saved?" and none of them could ask "do those credentials work?".
--
-- For a FRESH client that is the difference between a readiness check and a guess: a typo in a
-- password passes every requirement, reaches READY_FOR_APPROVAL, and is discovered when a real
-- prospect's first email fails on a warmed mailbox — which is the expensive way to find out.
--
-- Three columns, all nullable, NO DEFAULT and NO BACKFILL. NULL means NEVER CHECKED, which is
-- the honest reading of every row written before today and is deliberately NOT the same as
-- "failed". The sender gate treats never-checked as not ready and names the button to press.

ALTER TABLE public.client_inboxes
  ADD COLUMN IF NOT EXISTS verified_at      timestamptz,
  ADD COLUMN IF NOT EXISTS verify_failed_at timestamptz,
  ADD COLUMN IF NOT EXISTS verify_detail    text;

COMMENT ON COLUMN public.client_inboxes.verified_at IS
  'When this mailbox last PROVED it can log in - nodemailer verify() authenticated and sent nothing. NULL means never checked, which is not the same as failed and is the honest reading of every row written before 10 Sep. Cleared on a failed check so a mailbox that once worked and now does not cannot read as verified.';

COMMENT ON COLUMN public.client_inboxes.verify_failed_at IS
  'When a login check last FAILED. Kept alongside verified_at rather than replacing it so an operator can see that a check happened and what it said, rather than a silent NULL that looks identical to never having tried.';

COMMENT ON COLUMN public.client_inboxes.verify_detail IS
  'The operator-facing sentence from the last check - the named cause and the fix (App Password, SMTP AUTH disabled, port/TLS mismatch), never a raw SMTP code. Written on success and failure alike.';
