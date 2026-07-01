-- #261 (1 Jul 2026): enable RLS on 4 tables that had NONE but hold client_id / PII.
--
-- ROOT-CAUSE CONTEXT: the API talks to Postgres with the Supabase service_role key,
-- which BYPASSES RLS. So app-level ownership checks (derive the workspace from the
-- authed user — see #266, signals.ts, whatsapp.ts) remain the PRIMARY guard. This
-- migration is DEFENSE-IN-DEPTH: with RLS enabled and no policy, only bypass roles
-- (service_role / owner) can touch these tables — which stops any direct
-- anon/authenticated read of internal/cross-client data.
--
-- IF EXISTS guards each ALTER so this is safe across environments (see #262 drift).
-- Must be applied to prod (Supabase SQL editor) — like the other pending migrations.

alter table if exists public.figsy_approval_queue enable row level security;
alter table if exists public.figsy_linkedin_queue enable row level security;
alter table if exists public.founder_agent_logs   enable row level security;
alter table if exists public.african_data_moat     enable row level security;
