-- ═══════════════════════════════════════════════════════════════════════════════════════
-- A FROZEN PACKAGE IS NEVER MUTATED IN PLACE — IT IS REPLACED BY A NEW VERSION.
--
-- 🛑 WHAT THE HASH ALONE COULD NOT SAY. `review_preparation_hash` proves WHETHER the package
-- changed. It cannot say HOW MANY TIMES, it cannot be spoken to a client, and — the part that
-- matters — it gives an approval no way to name a version rather than a digest. Two re-freezes
-- that happen to produce the same work produce the same hash, which is correct for drift
-- detection and useless as an identity for "the package you read".
--
-- ⚠️ A MONOTONIC COUNTER, NOT A LEDGER OF OLD PACKAGES. The founder's rule is that a change
-- makes a NEW version and the old approval does not carry forward — not that superseded
-- packages stay retrievable. The counter makes the replacement legible and auditable; keeping
-- every historical snapshot is a product decision nobody has taken.
--
-- 🛑 AND `approved_preparation_version` IS WHAT STOPS AN APPROVAL DRIFTING FORWARD. It is
-- stamped from the review version at the moment of approval, so a later re-freeze moves
-- `review_preparation_version` and leaves the approved one behind — the two numbers disagreeing
-- IS the statement "this approval does not cover the current package".
--
-- ⚠️ EXPAND ONLY. Nullable, defaulted, no backfill of approvals that predate it: a programme
-- frozen before this migration carries `review_preparation_version = NULL`, which reads as
-- "unknown version", never as version zero.
-- ═══════════════════════════════════════════════════════════════════════════════════════

-- ── AND WHO APPROVED IT ────────────────────────────────────────────────────────────────
--
-- 🛑 AN APPROVAL RECORDED NO IDENTITY AT ALL. `approved_at` says when, the snapshot says what,
-- and nothing said WHO — so "the client approved this" was a claim the database could not
-- support. For the one act that turns prepared work into work we are allowed to run, that is
-- the wrong thing to be unable to answer.
--
-- ⚠️ TWO COLUMNS, BECAUSE THERE ARE TWO KINDS OF APPROVER and they carry different authority.
-- `approved_by_kind` distinguishes the CLIENT's own approval in Milla from an OPERATOR approval
-- in Vida; `approved_by_user_id` is the authenticated user behind a client approval. An
-- operator approval carries no user id — it is admin-key authority, not a session — and
-- recording one would invent a person.
ALTER TABLE public.programmes
  ADD COLUMN IF NOT EXISTS review_preparation_version   int,
  ADD COLUMN IF NOT EXISTS approved_preparation_version int,
  ADD COLUMN IF NOT EXISTS approved_by_kind             text,
  ADD COLUMN IF NOT EXISTS approved_by_user_id          uuid;

COMMENT ON COLUMN public.programmes.approved_by_kind IS
  'Who approved: ''client'' (the customer, in Milla, from their own session) or ''operator'' (Vida, admin-key authority). NULL means approved before identity was recorded.';

COMMENT ON COLUMN public.programmes.approved_by_user_id IS
  'The authenticated user behind a CLIENT approval. NULL for operator approvals — admin-key authority is not a session, and recording a user id for it would invent a person.';

COMMENT ON COLUMN public.programmes.review_preparation_version IS
  'Which frozen review package this is, counting from 1 and rising by one on every re-freeze. NULL means frozen before versioning existed. Never reused, never decremented.';

COMMENT ON COLUMN public.programmes.approved_preparation_version IS
  'The review version the client actually approved. It stays put when a later re-freeze moves review_preparation_version — the two disagreeing is how an approval is known not to cover the current package.';
