-- Audit fix (M6) — enforce the "one active confirmed booking per (client, lead)" invariant at
-- the DB level so two concurrent /book requests can't both insert a confirmed row (the app-level
-- read-then-insert check is TOCTOU-racy). Idempotent. Run once in Supabase (staging → prod).
-- NON-MONEY (capture is already idempotent); this just stops duplicate calendar_bookings rows.
--
-- NOTE: if legacy duplicate confirmed rows already exist this index creation will fail — dedupe
-- them first (keep the earliest per client+lead). Safe/no-op on a clean table.
create unique index if not exists calendar_bookings_one_confirmed_per_lead
  on public.calendar_bookings (client_id, lead_id)
  where status = 'confirmed';
