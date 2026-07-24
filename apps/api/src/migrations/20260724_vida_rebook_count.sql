-- #499m — no-show → rebook×2 → keep the $3. Idempotent. Run once in Supabase
-- (staging → prod). NON-MONEY: the $3 is captured at booking (calendar.ts:198) and is
-- KEPT on a no-show — no refund path fires. This column only tracks how many goodwill
-- rebooks a client has been given so the operator console can stop offering more after 2.
alter table public.calendar_bookings add column if not exists rebook_count int not null default 0;
