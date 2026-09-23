-- The Get Started form asks six questions `contact_requests` has no column for: the website,
-- the outcome they want, who to target, the volume, the timing, and — on the contact form —
-- what capacity they are writing in and the subject line.
--
-- Flattening those into `message` would make the row unreadable and unqueryable. Adding six
-- columns would tie the table's shape to one version of one web form. A jsonb column keeps
-- every answer, labelled, without the schema needing to change the next time a field is
-- added or removed from the page.
--
-- Backfill is not needed: nothing has ever written to this table. It was created on
-- 17 May 2026 and the two forms that should have filled it were never wired up.
ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS details jsonb;

-- `type` already exists with a default of 'demo' and carried the comment
-- `'demo' | 'general' | 'enterprise'`. The website now writes 'contact' and 'get-started',
-- so the comment is corrected rather than left describing values nothing sends.
COMMENT ON COLUMN contact_requests.type IS
  'Where the enquiry came from: ''contact'' or ''get-started'' (the website forms). Older values ''demo'', ''general'', ''enterprise'' were never written.';

COMMENT ON COLUMN contact_requests.details IS
  'Every answer that has no dedicated column, keyed by the label shown on the form.';

-- The anon INSERT policy from 20260517 stays as it is. The API writes with the service role,
-- so nothing here depends on anon inserts — but removing a policy is a separate decision
-- from adding a column, and this migration is only adding a column.
