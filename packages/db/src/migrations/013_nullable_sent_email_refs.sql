-- Migration 013 — allow NULL enrollment_id / campaign_id on figsy_sent_emails.
-- Run once against Supabase (SQL Editor). Idempotent-safe.
--
-- WHY: the day-1 outreach batch (sendDay1OutreachBatch) sends a first-touch email
-- that has no enrollment and no campaign, then records it in figsy_sent_emails with
-- NULL enrollment_id/campaign_id. Those columns were NOT NULL (migration 002), so the
-- insert FAILED silently (caught) — day-1 sends were never recorded, which (a) lost
-- them from the figsy_sent_emails history and (b) made them invisible to the warmup
-- daily cold-send cap (which counts this table). Relaxing the constraint fixes both.
-- FKs stay intact (a NULL simply means "no enrollment/campaign", which is correct here).

alter table public.figsy_sent_emails alter column enrollment_id drop not null;
alter table public.figsy_sent_emails alter column campaign_id   drop not null;
