-- Founder agent activity log
create table if not exists founder_agent_logs (
  id          uuid primary key default gen_random_uuid(),
  agent       text not null,  -- 'support' | 'cs' | 'ae'
  action      text not null,
  payload     jsonb,
  created_at  timestamptz default now()
);

create index if not exists idx_founder_agent_logs_agent on founder_agent_logs(agent);
create index if not exists idx_founder_agent_logs_created_at on founder_agent_logs(created_at desc);
