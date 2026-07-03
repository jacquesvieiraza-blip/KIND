-- #289 — NPS. Stores raw NPS survey responses; the admin card computes the score
-- (% promoters 9–10 minus % detractors 0–6). The client-facing collection widget
-- is a SEPARATE preview-gated follow-up — this migration + the admin/API side only.
-- NOT auto-applied — the founder runs this by hand.
create table if not exists public.nps_responses (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid references public.clients(id) on delete set null,
  score      integer not null check (score >= 0 and score <= 10),
  comment    text,
  created_at timestamptz not null default now()
);

create index if not exists nps_responses_created_at_idx on public.nps_responses(created_at desc);
