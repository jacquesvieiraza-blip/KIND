-- KIND AI Platform - Supabase Database Schema
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

create table if not exists public.clients (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_name text not null,
  industry text,
  country text not null default 'South Africa',
  website text,
  phone text,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);
