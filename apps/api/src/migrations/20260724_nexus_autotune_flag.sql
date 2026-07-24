-- #511 NEXUS · Phase 3 — the per-client auto-tune KILL-SWITCH. Idempotent. Run once in
-- Supabase (staging → prod). NON-MONEY (a boolean flag), but it GOVERNS money-sensitive
-- Phase-2 sourcing tuning: auto-tune is OFF by default for every client — the founder
-- explicitly enables it per client once they trust that client's Nexus. Default-deny.
alter table public.clients add column if not exists nexus_autotune_enabled boolean not null default false;
