-- ── MILLA'S MORNING BRIEF — ONE PER CLIENT PER LONDON DAY (P33 v3, 21 Aug 2026) ──────
--
-- Founder's clause: "ONE BRIEF PER CLIENT LOCAL DAY MAXIMUM: a second login the same
-- local day must resolve to the SAME brief message, never create a twin. Prove this
-- under concurrent first-logins as well as sequential logins."
--
-- ⚠️ A READ-THEN-WRITE CHECK CANNOT DELIVER THAT, AND THAT IS WHY THIS INDEX EXISTS.
-- The brief is created lazily when the client opens /milla. Two tabs, or a phone and a
-- laptop, hitting that page in the same instant both run "does today's brief exist?",
-- both get "no", and both insert. The client opens Milla to two identical good-mornings.
-- The only place two API processes can agree is the database, so the uniqueness is a
-- CONSTRAINT, not a code path — the loser of the race gets 23505 and re-reads the winner's
-- row. Same reasoning as the cron slot claim in lib/cron-guard.ts (#343).
--
-- ⚠️ WHY THIS RIDES ON "sources" RATHER THAN A NEW TABLE.
-- "milla_messages.sources" is jsonb and already exists (it carries RAG citations). Ordinary
-- chat rows put an ARRAY there; a brief puts an OBJECT: {"kind":"morning_brief","day":"…"}.
-- In Postgres, "sources->>'kind'" on an array yields NULL, not an error — so every normal
-- conversation row falls OUTSIDE this partial index and can never collide with it. A whole
-- new table for one tag would have to be joined on every brief read for no gain.
--
-- ⚠️ THE DAY IS A LONDON DAY, COMPUTED IN TYPESCRIPT, STORED AS TEXT.
-- R62 (founder-ruled 21 Aug): "why we working in SA time when I am based in the UK." The
-- product keeps Europe/London. The date is resolved in "lib/morning-brief.ts" with the
-- platform tz database (BST-safe) and written here as a plain 'YYYY-MM-DD' string, so this
-- index never has to know about timezones — and cannot disagree with the code about which
-- day it is, which is exactly what a "date_trunc('day', created_at)" index would do (it
-- would key on UTC and let a 00:30-BST login create the day's second brief).
--
-- Idempotent: safe to re-run. Creating an index concurrently is deliberately NOT used —
-- the runner executes inside a transaction, and CONCURRENTLY cannot run in one.

create unique index if not exists milla_messages_morning_brief_once_per_day_idx
  on public.milla_messages (client_id, (sources->>'day'))
  where sources->>'kind' = 'morning_brief';

-- Read path: "has this client had today's brief yet?" is answered by the index above.
-- Nothing else is needed — the brief is a normal assistant message in the normal thread,
-- so it is fetched by the existing GET /milla/sessions/:id/messages with no special casing.
