-- FIGSY agent memory: one row per client, updated after each campaign analysis
create table if not exists figsy_memory (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references clients(id) on delete cascade,
  best_subject_lines   text[]   default '{}',
  avg_reply_rate_30d   numeric  default 0,
  total_sent_all_time  integer  default 0,
  total_replies_all_time integer default 0,
  top_performing_icp   text,
  last_updated         timestamptz default now(),
  constraint figsy_memory_client_unique unique (client_id)
);

alter table figsy_memory enable row level security;

create policy "Clients can read own memory"
  on figsy_memory for select
  using (client_id = (select id from clients where user_id = auth.uid()));
