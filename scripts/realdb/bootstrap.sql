-- ── SUPABASE-COMPATIBLE BOOTSTRAP FOR THE DISPOSABLE TEST DATABASE ──────────────
--
-- WHY THIS FILE EXISTS.
--
-- `supabase/migrations/*.sql` are written against a Supabase database, not a plain
-- PostgreSQL one. They reference things Supabase creates for you before your first
-- migration ever runs: the `auth` schema and `auth.users`, the `auth.uid()` /
-- `auth.role()` helpers used by every RLS policy, and the three API roles
-- (`anon`, `authenticated`, `service_role`) that `GRANT` statements name.
--
-- A plain Postgres has none of those, so migration #1 dies on the first `references
-- auth.users(id)` and the harness proves nothing. This file creates the minimum
-- surface the repo's own migrations actually use — verified by grepping the whole
-- migration set, not guessed:
--
--   auth.users  → only `id` and `email` are ever referenced.
--   auth.uid()  → 30 uses, all inside RLS policies.
--   auth.role() → 8 uses, same.
--   roles       → anon (26), authenticated (33), service_role (60).
--
-- ⚠️ THIS IS A TEST SHIM, NOT A SUPABASE REPLICA. It deliberately does NOT reproduce
-- Supabase's GoTrue tables, JWT parsing, storage, realtime or the PostgREST request
-- context. What it buys is the thing the contract asks for: the repo's real migrations
-- applied to a real Postgres, so a real-database test can prove a real constraint.
--
-- Anything that needs true Supabase semantics (RLS as an anonymous caller, JWT claims)
-- is NOT provable here and must say so rather than pretend.

-- ── 1. EXTENSIONS ───────────────────────────────────────────────────────────────
-- `gen_random_uuid()` is core in PG13+, but `uuid_generate_v4()` (19 uses) and
-- `digest()` (3 uses) are not.
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- Supabase puts extensions in their own schema and some SQL qualifies them.
create schema if not exists extensions;

-- ── 2. THE THREE API ROLES ──────────────────────────────────────────────────────
-- `GRANT ... TO service_role` fails outright if the role does not exist, and a failed
-- grant aborts the whole migration file.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'supabase_admin') then
    create role supabase_admin nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticator') then
    create role authenticator nologin noinherit;
  end if;
end $$;

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema extensions to anon, authenticated, service_role;

-- ── 3. THE `auth` SCHEMA ────────────────────────────────────────────────────────
create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role;

create table if not exists auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text unique,
  raw_user_meta_data jsonb  not null default '{}'::jsonb,
  created_at         timestamptz not null default now()
);
grant select on table auth.users to service_role;

-- ── 4. THE RLS HELPERS ──────────────────────────────────────────────────────────
--
-- On Supabase these read the request's JWT out of the PostgREST GUCs. Here they read
-- the same GUC names, so a test can impersonate a user with
--   set local request.jwt.claim.sub = '<uuid>';
-- and the repo's own policies behave the way they were written.
--
-- `null` when unset is the correct shim: that is exactly what Supabase returns for an
-- unauthenticated request, so a policy that depends on `auth.uid()` denies by default
-- here too, instead of accidentally passing.
create or replace function auth.uid() returns uuid
  language sql stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create or replace function auth.role() returns text
  language sql stable
as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon')
$$;

create or replace function auth.email() returns text
  language sql stable
as $$
  select nullif(current_setting('request.jwt.claim.email', true), '')
$$;

create or replace function auth.jwt() returns jsonb
  language sql stable
as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;

-- ── 5. TWO ENUM TYPES THE REPO'S OWN BASELINE OMITS ─────────────────────────────
--
-- ⚠️ THIS IS A REPORTED FINDING, NOT A CONVENIENCE.
--
-- Production models `subscriptions.status` and `leads.status` as PostgreSQL ENUM types
-- (`subscription_status`, `lead_status`). The repo's schema files — `packages/db/src/schema.sql`
-- and the consolidated `supabase/staging-schema.sql` the harness uses as its baseline —
-- model both as `text` + a CHECK constraint. Four migrations then do `ALTER TYPE
-- subscription_status ADD VALUE …` / `ALTER TYPE lead_status ADD VALUE …`, and their own
-- comments record that they were written *after* production rejected a text-shaped
-- assumption ("invalid input value for enum subscription_status: 'paused'").
--
-- So the repo carries two incompatible descriptions of the same two columns, and the
-- harness cannot be faithful to both. It creates the TYPES so those four migrations apply
-- (one of them, `20260723_operator_audit_log.sql`, also creates the `operator_audit_log`
-- table, which is lost entirely if the file aborts). The COLUMNS stay text+CHECK, exactly
-- as the repo's baseline declares them.
--
-- ⚠️ WHAT THAT MEANS FOR A TEST: a real-DB test here CANNOT prove anything about the
-- enum-vs-text shape of those two columns. Production is the enum; the harness is the
-- baseline. Any test that cares must say so rather than claim proof.
--
-- Values below are the baseline CHECK sets, read from the baseline file; the migrations
-- add the rest themselves via ALTER TYPE.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'subscription_status') then
    create type subscription_status as enum ('active','inactive','trialing','past_due','cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'lead_status') then
    create type lead_status as enum
      ('pending','scored','contacted','consent_sent','consent_given','exported','rejected','opted_out');
  end if;
end $$;

-- ── 6. THE HARNESS'S OWN LEDGER ─────────────────────────────────────────────────
--
-- The production migration runner (`apps/api/src/lib/pending-migrations.ts`) keeps NO
-- record of what it applied — it replays all of its keys on every run. That is a known
-- defect (contract XC-3). The harness does not copy the defect: it records what it
-- applied, in order, with the outcome, so a test can assert "this migration ran" as a
-- fact read from the database instead of as an inference from a table existing.
create schema if not exists harness;
create table if not exists harness.applied_migrations (
  filename    text primary key,
  applied_at  timestamptz not null default now(),
  outcome     text not null check (outcome in
                ('applied', 'superseded_by_baseline', 'skipped_unsupported', 'failed')),
  error       text,
  sha256      text
);
comment on table harness.applied_migrations is
  'Written by scripts/realdb.sh only. Never exists in production — a test that reads it is reading harness state, not product state.';
