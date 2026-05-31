-- P3-3: In-portal client messaging
-- Direct message thread between client and KIND team

create table if not exists client_messages (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references clients(id) on delete cascade,
  content     text not null,
  sender_type text not null check (sender_type in ('client', 'admin')),
  read_at     timestamptz null,
  created_at  timestamptz not null default now()
);

create index if not exists client_messages_client_id_idx on client_messages(client_id);
create index if not exists client_messages_created_at_idx on client_messages(created_at desc);

-- RLS: clients can only read/write their own messages
alter table client_messages enable row level security;

create policy "clients_own_messages" on client_messages
  for all using (
    client_id in (
      select id from clients where user_id = auth.uid()
    )
  );

-- figsy_memory: add 3-type memory columns if not present
alter table figsy_memory add column if not exists episodic_memory jsonb null;
alter table figsy_memory add column if not exists longterm_memory jsonb null;
alter table figsy_memory add column if not exists preference_memory jsonb null;
