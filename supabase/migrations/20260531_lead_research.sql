-- P1-12: Cache AI-generated research summary per lead
-- to avoid repeat Claude calls
alter table leads
  add column if not exists research_summary jsonb;
