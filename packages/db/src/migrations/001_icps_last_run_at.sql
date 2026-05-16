-- Run this once against your Supabase database (SQL Editor)
alter table public.icps add column if not exists last_run_at timestamptz;
